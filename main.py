from typing import List, Optional, Any
from dataclasses import dataclass
import akshare as ak
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
import time


def retry_api_call(func, *args, max_retries=3, delay=1, logger=None, **kwargs):
    """
    API调用重试机制
    
    Args:
        func: 要调用的函数
        *args: 函数的位置参数
        max_retries: 最大重试次数
        delay: 重试间隔（秒）
        logger: 日志记录器（可选）
        **kwargs: 函数的关键字参数
        
    Returns:
        函数执行结果
        
    Raises:
        Exception: 如果所有重试都失败，抛出最后一次的异常
    """
    last_exception = None
    
    def log_info(msg):
        if logger:
            logger.info(msg)
        else:
            print(f"[INFO] {msg}")
    
    def log_warning(msg):
        if logger:
            logger.warning(msg)
        else:
            print(f"[WARNING] {msg}")
    
    def log_error(msg):
        if logger:
            logger.error(msg)
        else:
            print(f"[ERROR] {msg}")
    
    for attempt in range(max_retries + 1):  # +1 因为第一次不算重试
        try:
            result = func(*args, **kwargs)
            if attempt > 0:
                log_info(f"API调用成功（第{attempt}次重试）")
            return result
        except Exception as e:
            last_exception = e
            if attempt < max_retries:
                log_warning(f"API调用失败（第{attempt + 1}次尝试），{delay}秒后重试: {str(e)}")
                time.sleep(delay)
            else:
                log_error(f"API调用失败，已达到最大重试次数({max_retries}): {str(e)}")
    
    raise last_exception


@dataclass
class Input:
    """输入参数"""
    pass  # 当前使用硬编码参数，暂不需要输入参数


@dataclass
class FundData:
    """基金数据"""
    code: str  # 基金代码
    name: str  # 基金名称
    premium_rate: float  # 溢价率（%）
    nav_date: str  # 净值日期


class Output:
    """输出结果 - 格式化字符串"""
    def __init__(self, content: str):
        self.content = content


class Args:
    def __init__(self, input_data, logger):
        self.input = input_data
        self.logger = logger


def handler(args: Args) -> Output:
    """
    获取LOF基金溢价率数据
    
    Args:
        args: 包含输入参数和日志实例的参数对象
        
    Returns:
        包含所有基金数据和分析结果的输出对象
    """
    try:
        # 硬编码参数配置
        max_funds = None
        max_workers = 1
        watch_list = ['161116', '160723', '161129']  # 特别关注的基金列表
        
        args.logger.info(f"使用硬编码参数: max_funds={max_funds}, max_workers={max_workers}, watch_list={watch_list}")
        
        args.logger.info("开始获取LOF基金数据...")
        
        # 获取LOF基金溢价率数据
        # 使用AkShare的fund_lof_spot_em接口获取LOF基金实时数据
        try:
            df = retry_api_call(ak.fund_lof_spot_em, max_retries=3, delay=2, logger=args.logger)
            args.logger.info(f"成功获取LOF基金数据，共 {len(df)} 行")
        except Exception as e:
            error_msg = f"获取LOF基金列表失败（已重试3次）: {str(e)}"
            args.logger.error(error_msg)
            return Output(f"❌ 错误：{error_msg}")
        
        # 数据处理和筛选
        if df.empty:
            args.logger.warning("获取到的数据为空")
            return Output("❌ 错误：未获取到任何LOF基金数据")
        
        # 检查关键列是否存在
        required_columns = ['代码', '名称', '最新价']
        missing_cols = [col for col in required_columns if col not in df.columns]
        if missing_cols:
            error_msg = f"未找到必要的数据列: {missing_cols}"
            args.logger.error(error_msg)
            return Output(f"❌ 错误：{error_msg}")
        
        args.logger.info("找到所有必要列：代码、名称、最新价")
        
        # 筛选有效数据
        args.logger.info(f"筛选前数据行数: {len(df)}")
        df = df.dropna(subset=['代码', '名称', '最新价'])
        args.logger.info(f"去除空值后数据行数: {len(df)}")
        
        if len(df) == 0:
            args.logger.warning("处理后数据为空")
            return Output("❌ 错误：筛选后无有效基金数据")
        
        # 根据输入参数限制处理的基金数量
        if max_funds and len(df) > max_funds:
            args.logger.info(f"限制处理前 {max_funds} 只基金")
            df = df.head(max_funds)
        
        # 智能预筛选，减少API调用次数
        def should_skip_fund(fund_code, fund_name, market_price):
            """判断是否应该跳过某只基金（减少API调用）"""
            
            # 1. 价格异常筛选
            if market_price <= 0 or market_price > 100:
                return True, "价格异常"
            
            # 2. 基金类型筛选（这些类型很少有溢价）
            skip_keywords = ['债券', '货币', '短债', '纯债', '中债', '国债', '信用债', 
                           '可转债', '企业债', '政府债', '同业存单']
            if any(keyword in fund_name for keyword in skip_keywords):
                return True, "债券/货币类基金"
            
            # 3. 基金代码规律筛选
            if fund_code.startswith('511'):  # 货币ETF通常在LOF列表中但很少溢价
                return True, "货币ETF"
            
            # 4. 价格过低筛选（通常净值接近1，价格过低可能是数据问题）
            if market_price < 0.5:
                return True, "价格过低"
                
            return False, ""
        
        # 应用预筛选
        args.logger.info("开始智能预筛选，减少API调用...")
        original_count = len(df)
        filtered_funds = []
        skipped_count = 0
        skip_reasons = {}
        
        for _, row in df.iterrows():
            fund_code = str(row['代码'])
            fund_name = str(row['名称'])
            market_price = float(row['最新价'])
            
            should_skip, reason = should_skip_fund(fund_code, fund_name, market_price)
            if should_skip:
                skipped_count += 1
                skip_reasons[reason] = skip_reasons.get(reason, 0) + 1
            else:
                filtered_funds.append((fund_code, fund_name, market_price))
        
        args.logger.info(f"预筛选完成: {original_count} -> {len(filtered_funds)} 只基金（跳过 {skipped_count} 只）")
        for reason, count in skip_reasons.items():
            args.logger.info(f"  跳过原因 - {reason}: {count} 只")
        
        if not filtered_funds:
            args.logger.warning("预筛选后无基金需要处理")
            return Output("⚠️ 警告：预筛选后没有需要处理的基金")
        
        # 优先级排序：优先处理可能有溢价的基金类型
        priority_keywords = ['原油', '黄金', '商品', '海外', '港股', '美股', 'QDII', 
                           '石油', '贵金属', '有色', '煤炭', '钢铁']
        priority_funds = []
        normal_funds = []
        
        for fund_info in filtered_funds:
            fund_code, fund_name, market_price = fund_info
            if any(keyword in fund_name for keyword in priority_keywords):
                priority_funds.append(fund_info)
            else:
                normal_funds.append(fund_info)
        
        # 重新排序：优先级基金在前
        fund_list = priority_funds + normal_funds
        args.logger.info(f"优先级排序: 高优先级 {len(priority_funds)} 只，普通 {len(normal_funds)} 只")

        # 使用多线程并发获取净值数据
        args.logger.info(f"开始并发获取 {len(fund_list)} 只基金的净值数据...")
        start_time = time.time()
        
        def get_fund_premium_rate(fund_info):
            """获取单只基金的溢价率"""
            fund_code, fund_name, market_price = fund_info
            try:
                # 获取基金净值数据
                nav_df = retry_api_call(
                    ak.fund_open_fund_info_em, 
                    symbol=fund_code, 
                    indicator="单位净值走势",
                    max_retries=3,
                    delay=1,
                    logger=args.logger
                )
                
                if not nav_df.empty:
                    # 获取最新净值（最后一行数据）
                    latest_nav = float(nav_df.iloc[-1]['单位净值'])
                    nav_date = nav_df.iloc[-1]['净值日期']
                    
                    # 计算溢价率（保留2位小数）
                    premium_rate = round((market_price - latest_nav) / latest_nav * 100, 2)
                    
                    return {
                        'success': True,
                        'data': FundData(
                            code=fund_code,
                            name=fund_name,
                            premium_rate=premium_rate,
                            nav_date=nav_date
                        ),
                        'details': f"市价={market_price:.4f}, 净值={latest_nav:.4f}({nav_date}), 溢价率={premium_rate:.2f}%"
                    }
                else:
                    return {'success': False, 'error': '净值数据为空', 'code': fund_code, 'name': fund_name}
                    
            except Exception as e:
                return {'success': False, 'error': f'获取净值失败（已重试3次）: {str(e)}', 'code': fund_code, 'name': fund_name}
        
        # 使用线程池并发处理
        results = []
        successful_count = 0
        failed_count = 0
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 提交所有任务
            future_to_fund = {executor.submit(get_fund_premium_rate, fund_info): fund_info[0] for fund_info in fund_list}
            
            # 收集结果
            for future in as_completed(future_to_fund):
                result = future.result()
                if result['success']:
                    results.append(result['data'])
                    successful_count += 1
                    args.logger.info(f"✓ {result['data'].code} {result['data'].name}: {result['details']}")
                else:
                    failed_count += 1
                    args.logger.warning(f"✗ {result['code']} {result['name']}: {result['error']}")
        
        end_time = time.time()
        args.logger.info(f"净值获取完成: 成功 {successful_count} 只，失败 {failed_count} 只，耗时 {end_time - start_time:.1f} 秒")
        
        if not results:
            args.logger.warning("没有成功获取到任何基金的溢价率数据")
            return Output("❌ 错误：未能获取到任何基金的溢价率数据")
        
        # 过滤掉溢价率小于0的基金（只保留有溢价的基金）
        premium_results = [result for result in results if result.premium_rate >= 0]
        args.logger.info(f"过滤前: {len(results)} 只基金，过滤后: {len(premium_results)} 只基金（只保留溢价率>=0的基金）")
        
        if not premium_results:
            args.logger.warning("没有找到任何溢价的基金")
            return Output("⚠️ 警告：没有找到任何溢价的基金")
        
        # 按溢价率从高到低排序
        premium_results.sort(key=lambda x: x.premium_rate, reverse=True)
        args.logger.info(f"排序完成，溢价率范围: {premium_results[-1].premium_rate:.2f}% ~ {premium_results[0].premium_rate:.2f}%")
        
        # 处理特别关注列表（只包含有溢价的基金）
        watch_results = []
        if watch_list:
            args.logger.info("处理特别关注基金列表...")
            for watch_code in watch_list:
                # 在溢价结果中查找特别关注的基金
                found = False
                for result in premium_results:
                    if result.code == watch_code:
                        watch_results.append(result)
                        args.logger.info(f"✓ {result.code} {result.name}: 溢价率 {result.premium_rate:.2f}%")
                        found = True
                        break
                
                if not found:
                    # 检查是否在原始结果中但是是折价的
                    is_discount = any(r.code == watch_code and r.premium_rate < 0 for r in results)
                    if is_discount:
                        args.logger.info(f"✗ {watch_code}: 基金为折价，不在溢价列表中")
                    else:
                        args.logger.warning(f"✗ {watch_code}: 未找到数据（可能获取失败）")
        
        # 构造格式化的输出字符串
        from datetime import datetime
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        output_lines = []
        output_lines.append(f"📅 计算执行时间：{current_time}")
        output_lines.append(f"📈 有溢价基金：{len(premium_results)} 只，数据成功率：{successful_count}/{successful_count + failed_count} ({successful_count/(successful_count + failed_count)*100:.1f}%)")
        
        if premium_results:
            # 找到最常见的净值日期（大多数基金的净值日期）
            nav_dates = [fund.nav_date for fund in premium_results]
            most_common_date = max(set(nav_dates), key=nav_dates.count)
            output_lines.append(f"📅 溢价率所代表的实际日期（T-1）: {most_common_date}")
        
        # 特别关注的基金
        if watch_results:
            output_lines.append("")
            output_lines.append("🔥 特别关注:")
            for i, fund in enumerate(watch_results, 1):
                output_lines.append(f"  {i:2d}. {fund.code} {fund.name} 溢价率: {fund.premium_rate:.2f}%")
        elif watch_list:
            output_lines.append("")
            output_lines.append("🔥 特别关注:")
            output_lines.append("  ⚠️ 关注的基金暂无溢价或获取失败")
        
        # 前5只溢价率最高的基金
        if premium_results:
            output_lines.append("")
            output_lines.append("📈 溢价率最高的LOF基金（TOP5）:")
            top_5 = premium_results[:5]
            for i, fund in enumerate(top_5, 1):
                output_lines.append(f"  {i:2d}. {fund.code} {fund.name} 溢价率: {fund.premium_rate:.2f}%")
        
        # 构造最终输出
        result_content = "\n".join(output_lines)
        args.logger.info(f"生成报告完成，共{len(premium_results)}只有溢价基金")
        
        return Output(result_content)
        
    except Exception as e:
        error_message = f"获取LOF基金溢价率数据时发生错误: {str(e)}"
        args.logger.error(error_message)
        import traceback
        args.logger.error(f"详细错误信息: {traceback.format_exc()}")
        
        return Output(f"❌ 系统错误：{error_message}")

# 本地测试用函数（仅用于调试，部署时不会执行）
if __name__ == "__main__":
    class MockLogger:
        def info(self, msg): print(f"[INFO] {msg}")
        def warning(self, msg): print(f"[WARNING] {msg}")
        def error(self, msg): print(f"[ERROR] {msg}")
    
    # 模拟 serverless 环境 - 输入参数现在是硬编码的，所以可以传入任意值
    mock_args = Args("{}", MockLogger())  # 模拟空JSON输入
    
    print("LOF基金溢价率计算工具（本地测试）")
    
    result = handler(mock_args)
    
    print(f"\n=== 执行结果 ===")
    print(result.content)
