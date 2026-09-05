import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'fa';

export interface Translations {
  [key: string]: string;
}

const faTranslations: Translations = {
  // Brand & Navigation
  app_name: 'سنترون',
  app_subname: 'سامانه تحلیل کمّی و هوش بازارهای مالی',
  version: 'نسخه ۱.۰',
  refresh_prices_news: 'به‌روزرسانی داده‌ها و قیمت‌ها',
  refreshing: 'در حال دریافت اطلاعات...',
  last_updated: 'آخرین به‌روزرسانی',
  min_ago: 'دقیقه پیش',
  just_now: 'هم‌اکنون',
  hours_ago: 'ساعت پیش',
  days_ago: 'روز پیش',
  target_asset: 'دارایی انتخابی',
  bar_interval: 'تایم‌فریم کندل',
  active_feed_status: 'وضعیت اتصال فیدها',
  prices_feed: 'فید قیمت‌های زنده',
  public_rss: 'خبرگزاری‌های مالی',
  sentiment_model: 'مدل تمایلات FinBERT',
  db_location: 'پایگاه داده ذخیره‌سازی',
  db_desc: 'پایگاه داده محلی با کارایی بالا',
  engine_label: 'موتور محاسباتی',
  theme_light: 'روشن',
  theme_dark: 'تاریک',
  theme_system: 'سیستم',
  lang_en: 'English',
  lang_fa: 'فارسی',
  language_toggle: 'تغییر زبان',
  toggle_navigation: 'منوی ناوبری',

  // Tabs
  tab_overview: 'نمای کلی بازار',
  tab_prices: 'قیمت و معاملات',
  tab_technicals: 'اندیکاتورهای تکنیکال',
  tab_sentiment: 'جریان احساسات بازار',
  tab_news: 'اخبار و گزارش‌ها',
  tab_social: 'دیدگاه‌های معامله‌گران',
  tab_model: 'سیگنال‌ها و استراتژی هوش مصنوعی',
  tab_alpaca: 'معاملات آلپاکا (Alpaca)',

  // Subtabs in ModelTab
  subtab_architecture: 'استودیو طراحی و بهینه‌سازی الگوریتم‌ها',
  subtab_simulation: 'ارزیابی عملکرد پرتفوی و استراتژی معاملات',
  subtab_tournament: 'اجماع مدل‌های تحلیلی هوش مصنوعی',
  subtab_quant_matrix: 'تحلیل چندعاملی و انتساب ریسک',

  // Overview Tab
  exec_briefing: 'گزارش تحلیلی هوش بازار',
  exec_briefing_desc: 'سنتز جامع بازار شامل ساختار قیمت، تمایلات زبانی اخبار و جهت‌گیری مدل‌های یادگیری ماشین برای اتخاذ تصمیمات سرمایه‌گذاری بهینه.',
  active_asset: 'دارایی فعال',
  last_close: 'آخرین قیمت پایانی',
  price_regime: 'ساختار روند قیمت',
  sentiment_flow: 'جریان تمایلات بازار (FinBERT)',
  ml_bias: 'جهت‌گیری مدل‌های کمّی',
  regime_above_sma: 'روند صعودی پایدار (بالای میانگین ۲۰ و ۵۰)',
  regime_below_sma: 'روند اصلاحی/نزولی (زیر میانگین‌های متحرک)',
  regime_mixed: 'فاز نوسانی و تجمیع قیمت',
  sentiment_pos: 'تمایلات مثبت و خوش‌بینانه',
  sentiment_neg: 'تمایلات محتاطانه و منفی',
  sentiment_neu: 'تمایلات خنثی و متعادل',
  ml_bias_up: 'سوگیری صعودی با قطعیت بالا',
  ml_bias_down: 'سوگیری نزولی با قطعیت بالا',
  ml_bias_flat: 'محدوده نوسان کم و فاقد روند',
  quick_stats: 'خلاصه داده‌های ثبت‌شده',
  stored_data_overview: 'آمار مخزن داده‌های تاریخی و سیگنال‌ها',
  price_bars_count: 'کندل‌های قیمتی ثبت‌شده',
  news_count: 'گزارش‌های خبری ارزیابی‌شده',
  social_count: 'پیام‌های تحلیل‌شده معامله‌گران',
  technical_count: 'محاسبات فاکتورهای تکنیکال',
  model_runs_count: 'دوره‌های آزمون استراتژی',
  sentiment_aggs_count: 'پنجره‌های تجمیع احساسات',
  sys_diagnostics: 'وضعیت سلامت خط لوله داده',
  ingestion_history: 'تاریخچه واکشی فیدها',
  ingestion_col_provider: 'منبع داده',
  ingestion_col_type: 'نوع اطلاعات',
  ingestion_col_items: 'تعداد رکورد',
  ingestion_col_status: 'وضعیت',
  ingestion_col_time: 'زمان ثبت',
  status_success: 'موفق',
  status_failed: 'ناموفق',
  status_warning: 'هشدار',
  no_logs: 'هیچ رکوردی ثبت نشده است.',
  system_hints: 'پیشنهادات و توصیه‌های سیستم',
  jump_to_tab: 'مشاهده جزئیات',

  // Prices Tab
  price_chart_title: 'نمودار تاریخچه قیمت و حجم معاملات',
  timeframe: 'بازه زمانی',
  tf_1w: '۱ هفته',
  tf_1m: '۱ ماه',
  tf_3m: '۳ ماه',
  tf_all: 'همه',
  export_csv: 'دانلود فایل CSV',
  metric_period_high: 'بالاترین قیمت دوره',
  metric_period_low: 'پایین‌ترین قیمت دوره',
  metric_return: 'بازدهی کل دوره',
  metric_avg_volume: 'میانگین حجم معاملات',
  table_date: 'تاریخ / زمان',
  table_open: 'قیمت باز شدن',
  table_high: 'بالاترین قیمت',
  table_low: 'پایین‌ترین قیمت',
  table_close: 'قیمت پایانی',
  table_volume: 'حجم معاملات',
  bars_loaded: 'کندل بارگذاری شد',
  no_price_bars: 'اطلاعات قیمتی برای این بازه موجود نیست.',

  // Technicals Tab
  tech_header_title: 'شاخص‌های تخصصی تحلیل تکنیکال',
  sma_trend_title: 'روند میانگین متحرک ۲۰ روزه (SMA 20)',
  rsi_14_title: 'شاخص قدرت نسبی (RSI 14)',
  macd_momentum_title: 'مومنتوم مکدی (MACD)',
  atr_volatility_title: 'دامنه نوسان واقعی (ATR 14)',
  price_vs_sma: 'موقعیت قیمت نسبت به میانگین',
  relative_strength_desc: 'شاخص سنجش شتاب قیمت در بازه ۰ تا ۱۰۰',
  macd_div_desc: 'واگرایی هیستوگرام نسبت به خط سیگنال',
  atr_desc: 'دامنه نوسان انتظاری قیمت',
  signal_bullish: 'صعودی',
  signal_bearish: 'نزولی',
  signal_neutral: 'خنثی',
  signal_overbought: 'اشباع خرید',
  signal_oversold: 'اشباع فروش',
  signal_positive_cross: 'تقاطع مثبت',
  signal_negative_cross: 'تقاطع منفی',
  toggle_overlays: 'تنظیمات نمایش اندیکاتورها',
  show_sma20: 'میانگین متحرک ۲۰ روزه',
  show_sma50: 'میانگین متحرک ۵۰ روزه',
  show_bb: 'باندهای بولینگر',
  chart_price_ma: 'نمودار قیمت و میانگین‌های متحرک',
  chart_rsi_title: 'نمودار قدرت نسبی (RSI)',
  chart_macd_title: 'نوسان‌گر MACD و خط سیگنال',
  legend_close: 'قیمت پایانی',
  legend_sma20: 'میانگین ۲۰',
  legend_sma50: 'میانگین ۵۰',
  legend_upper_bb: 'باند بالایی',
  legend_lower_bb: 'باند پایینی',
  legend_macd: 'خط MACD',
  legend_signal: 'خط سیگنال',
  legend_hist: 'هیستوگرام',
  levels_bound: 'سطوح اشباع خرید (۷۰) و اشباع فروش (۳۰)',
  no_tech_data: 'داده کافی برای محاسبه شاخص‌ها موجود نیست.',

  // Sentiment Tab
  sentiment_header_title: 'پایش چندافقی تمایلات بازار',
  sentiment_composite: 'شاخص ترکیبی تمایلات',
  sentiment_desc: 'تحلیل احساسات مبتنی بر هوش مصنوعی FinBERT با پردازش مقالات معتبر مالی و دیدگاه‌های شبکه‌های اجتماعی.',
  select_window: 'پنجره زمانی تحلیل',
  window_hours: 'ساعت',
  window_days: 'روز',
  window_24h: '۲۴ ساعت گذشته (کوتاه‌مدت)',
  window_72h: '۷۲ ساعت گذشته (میان‌مدت)',
  window_168h: '۷ روز گذشته (بلندمدت)',
  desk_vs_retail_title: 'مقایسه دیدگاه منابع سازمانی و فعالان خرد',
  desk_analysts: 'تحلیلگران و خبرگزاری‌های مرجع',
  retail_community: 'دیدگاه‌های عمومی و شبکه‌های اجتماعی',
  total_mentions_evaluated: 'کل موارد بررسی‌شده',
  sentiment_bullish_pct: 'درصد مثبت و خوش‌بین',
  sentiment_neutral_pct: 'درصد خنثی و بدون سوگیری',
  sentiment_bearish_pct: 'درصد منفی و محتاط',
  polarity_meter: 'قطبیت تمایلات بازار',
  no_sentiment_data: 'داده تمایلات در این پنجره زمانی یافت نشد.',

  // News Tab
  news_header_title: 'فید زنده اخبار و تحلیل‌های مالی',
  news_search_placeholder: 'جستجو در تیترها، متن یا خبرگزاری‌ها...',
  news_all_sources: 'همه منابع خبری',
  scrape_fresh_news: 'دریافت آخرین اخبار',
  read_full_story: 'مشاهده گزارش کامل',
  sentiment_tag: 'تمایل',
  published_by: 'منتشرکننده',
  no_news_found: 'خبری متناسب با جستجو یافت نشد.',
  sentiment_bullish: 'مثبت / صعودی',
  sentiment_bearish: 'منفی / نزولی',
  sentiment_neutral: 'خنثی',
  show_original_en: 'متن اصلی (انگلیسی)',
  show_translated_fa: 'ترجمه فارسی',
  auto_translated_badge: 'ترجمه‌شده به فارسی',
  translate_headlines_ai: 'ترجمه هوشمند تیترها',

  // Social Tab
  social_header_title: 'دیدگاه‌ها و نبض گفتگوی معامله‌گران',
  social_search_placeholder: 'جستجو در پیام‌ها، نویسندگان یا کانال‌ها...',
  all_channels: 'همه پلتفرم‌ها',
  channel_reddit: 'ردیت (Reddit)',
  channel_twitter: 'توییتر / شبکه اکس',
  channel_telegram: 'کانال‌های تحلیلی',
  view_discussion: 'مشاهده منبع گفتگو',
  author: 'نویسنده',
  no_social_found: 'پیامی در این بخش یافت نشد.',

  // Model Tab
  model_header_title: 'پیش‌بینی روند و آزمون استراتژی معاملات',
  model_desc: 'مدل‌های یادگیری ماشین با پردازش اندیکاتورهای مومنتوم، حجم و تمایلات بازار، سیگنال‌های احتمالی حرکت بعدی را استخراج می‌کنند.',
  model_prediction_badge: 'سیگنال جهت روند',
  confidence_score: 'سطح اطمینان مدل',
  target_horizon: 'افق پیش‌بینی',
  target_horizon_val: 'کندل بعدی',
  class_probs: 'توزیع احتمال سیگنال‌ها',
  prob_up_label: 'احتمال صعود',
  prob_flat_label: 'احتمال خنثی',
  prob_down_label: 'احتمال نزول',
  top_shap_factors: 'فاکتورهای دارای بیشترین اثر بر تصمیم مدل',
  shap_desc: 'میزان تاثیرگذاری هر متغیر در شکل‌گیری سیگنال نهایی.',
  interactive_simulator_title: 'ارزیابی استراتژی و آزمون عملکرد تاریخی',
  simulator_desc: 'محاسبه بازده خالص، نرخ برد و عملکرد استراتژی با در نظر گرفتن کارمزد معاملات و لغزش قیمت.',
  sim_param_conf: 'حداقل سطح اطمینان برای ورود',
  sim_param_fee: 'کارمزد معاملات (Basis Points)',
  sim_param_slip: 'لغزش قیمت (Slippage BPS)',
  sim_stat_return: 'بازده خالص استراتژی',
  sim_stat_winrate: 'نرخ موفقیت معامله (Win Rate)',
  sim_stat_trades: 'تعداد معاملات انجام‌شده',
  walk_forward_cv_title: 'اعتبارسنجی پیش‌رونده خارج از نمونه (Walk-Forward)',
  cv_desc: 'ارزیابی استراتژی در پنجره‌های متوالی بازار بدون سوگیری ناشی از داده‌های آینده.',
  col_fold: 'بخش (Fold)',
  col_train_period: 'دوره آموزش',
  col_test_period: 'دوره آزمون',
  col_accuracy: 'دقت سیگنال',
  col_sharpe: 'ضریب شارپ',
  col_max_dd: 'حداکثر افت سرمایه (Max Drawdown)',
  no_model_data: 'داده‌های مدل برای دارایی یا تایم‌فریم انتخاب‌شده آماده نیست.',

  // Simulation & Portfolio Evaluation
  sim_banner_badge: 'موتور ارزیابی استراتژی پرتفوی (۱۰٬۰۰۰ دلار)',
  sim_banner_title: 'شبیه‌سازی و ارزیابی معاملات الگوریتمی',
  sim_banner_desc: 'ارزیابی جامع عملکرد الگوریتم معاملاتی بر پایه سرمایه اولیه ۱۰٬۰۰۰ دلاری، شامل محاسبه دقیق کارمزد، لغزش قیمت و مدیریت ریسک حد سود و ضرر.',
  btn_run_sim: 'اجرای ارزیابی پرتفوی',
  btn_compare_models: 'مقایسه عملکرد تمام مدل‌ها',
  sim_selected_model: 'مدل الگوریتمی انتخاب‌شده:',
  sim_initial_capital: 'سرمایه اولیه آزمون ($):',
  table_trade_history: 'دفترچه معاملات و سفارش‌های اجراشده',
  btn_institutional_report: 'دریافت گزارش تحلیلی جامع',
  metric_final_balance: 'موجودی پایانی پرتفوی',
  metric_net_profit: 'سود / زیان خالص',
  metric_profit_factor: 'ضریب سودآوری (Profit Factor)',
  metric_max_drawdown: 'حداکثر افت سرمایه',
  trade_col_action: 'دستور',
  trade_col_price: 'قیمت اجرا',
  trade_col_units: 'تعداد دارایی',
  trade_col_pnl: 'سود/زیان',
  trade_col_balance: 'مانده پرتفوی',
  trade_col_reason: 'منطق ورود/خروج',

  // Model Consensus (Tournament)
  tournament_title: 'اجماع و چشم‌انداز مدل‌های هوش مصنوعی',
  tournament_desc: 'تحلیل و همگرایی دیدگاه‌های مدل‌های پیشرو هوش مصنوعی و مدل‌های کمّی بر روی دارایی هدف همراه با استخراج دلایل تحلیلی.',
  btn_run_consensus: 'به‌روزرسانی اجماع مدل‌ها',
  consensus_verdict: 'دیدگاه تجمیعی و قطعی بازار',
  model_leader: 'مدل پیشتاز این دوره',

  // Quantitative Studio (Architecture Lab)
  tab_architecture: 'استودیو طراحی و بهینه‌سازی الگوریتم‌ها',
  architecture_desc: 'طراحی، تنظیم پارامترهای استراتژی و اعتبارسنجی الگوریتم‌های کمّی در کنار مدل‌های هوش مصنوعی.',
  btn_train_model: 'اعتبارسنجی و اجرای استراتژی',
  btn_autotune: 'بهینه‌سازی خودکار پارامترهای معاملاتی',
  training_in_progress: 'در حال اجرای محاسبات و اعتبارسنجی تاریخی...',
  profitable_models: 'استراتژی‌های سودده تاییدشده',
  loss_models: 'استراتژی‌های نیازمند بازنگری و بهینه‌سازی',
  why_profit_loss: 'تفکیک و تحلیل ریشه‌ای عوامل عملکرد استراتژی‌ها',
  compare_with_llms: 'مقایسه عملکرد با مدل‌های هوش مصنوعی',
  diagnostics_root_causes: 'علل ریشه‌ای شناسایی‌شده',
  diagnostics_recommendations: 'طرح بهینه‌سازی استراتژی',
  metric_roi: 'بازده کل سرمایه (ROI)',
  metric_sharpe: 'ضریب شارپ',
  metric_winrate: 'نرخ برد معامله',
  metric_max_dd: 'حداکثر افت سرمایه',
  metric_train_loss: 'خطای آموزش نهایی',
  metric_val_loss: 'خطای اعتبارسنجی',
  metric_accuracy: 'دقت سیگنال',
  rr_ratio_label: 'نسبت ریسک به پاداش (R:R)',
  take_profit_label: 'حد سود (Take-Profit)',
  stop_loss_label: 'حد ضرر (Stop-Loss)',
  buy_rsi_label: 'آستانه ورود RSI',
  sell_rsi_label: 'آستانه خروج RSI',
  pos_size_label: 'درصد تخصیص سرمایه در هر پوزیشن',
  volatility_gating_label: 'فیلتر هوشمند نوسانات (ATR Gating)',
  learning_rate_label: 'نرخ یادگیری (Learning Rate)',
  dropout_label: 'ضریب Dropout (منظم‌سازی)',
  l2_reg_label: 'منظم‌سازی L2 Weight Decay',
  epochs_label: 'تعداد دوره‌های اعتبارسنجی (Epochs)',
  loss_func_label: 'تابع هدف بهینه‌سازی',
  optimizer_label: 'الگوریتم بهینه‌ساز',
  activation_label: 'تابع فعال‌ساز',
  // Extended Trading & Signal terminology
  action_buy: 'خرید (BUY)',
  action_sell: 'فروش (SELL)',
  action_hold: 'نگهداری (HOLD)',
  action_long: 'معامله خرید (Long)',
  action_short: 'معامله فروش (Short)',
  suggested_allocation: 'درصد تخصیص سرمایه',
  target_take_profit: 'حد سود تعیین‌شده (Take Profit)',
  risk_stop_loss: 'حد ضرر خروج (Stop Loss)',
  risk_reward_ratio: 'نسبت سود به ریسک (R:R)',
  key_drivers: 'عوامل کلیدی تصمیم‌گیری',
  ai_reasoning: 'زنجیره استدلال و تحلیل هوش مصنوعی',
  latency_ms: 'تاخیر پردازش',
  throughput_tok_sec: 'سرعت پردازش (توکن بر ثانیه)',
  tokens_used: 'توکن‌های مصرف‌شده',
  agreement_score: 'میزان همگرایی و توافق مدل‌ها',
  synthetic_conviction: 'درجه قطعیت استراتژیک',
  trade_filter_all: 'همه معاملات',
  trade_filter_buy: 'سفارش‌های خرید',
  trade_filter_sell: 'سفارش‌های فروش',
  trade_filter_win: 'معاملات سودده',
  trade_filter_loss: 'معاملات زیان‌ده',
  alpha_vs_benchmark: 'آلفای استراتژی نسبت به بازار',
  equity_curve_title: 'نمودار رشد ارزش پرتفوی',
  benchmark_curve: 'بازدهی انفعالی بازار (Buy & Hold)',
  current_holdings: 'ارزش دارایی‌های در پوزیشن',
  available_cash: 'موجودی نقد آزاد',
  daily_range: 'بازه نوسان ۲۴ ساعته',
  daily_high: 'سقف ۲۴ ساعته',
  daily_low: 'کف ۲۴ ساعته',
  current_price: 'قیمت جاری',
  live_status: 'زنده',
};

const enTranslations: Translations = {
  // Brand & Navigation
  app_name: 'Sentrune',
  app_subname: 'Quantitative Market Intelligence & Strategy Workstation',
  version: 'V1.0',
  refresh_prices_news: 'Refresh Market Feeds',
  refreshing: 'Refreshing Feeds...',
  last_updated: 'Last updated',
  min_ago: 'min ago',
  just_now: 'just now',
  hours_ago: 'hours ago',
  days_ago: 'days ago',
  target_asset: 'TARGET ASSET',
  bar_interval: 'TIMEFRAME',
  active_feed_status: 'Data Feed Connectivity',
  prices_feed: 'Live Price Feeds',
  public_rss: 'Financial Press Feeds',
  sentiment_model: 'FinBERT Sentiment Engine',
  db_location: 'Storage Engine',
  db_desc: 'High-performance local data store',
  engine_label: 'Compute Engine',
  theme_light: 'Light',
  theme_dark: 'Dark',
  theme_system: 'System',
  lang_en: 'English',
  lang_fa: 'فارسی',
  language_toggle: 'Change Language',
  toggle_navigation: 'Navigation Menu',

  // Tabs
  tab_overview: 'Market Overview',
  tab_prices: 'Price & History',
  tab_technicals: 'Technical Analysis',
  tab_sentiment: 'Market Sentiment',
  tab_news: 'Financial News',
  tab_social: 'Community & Social Pulse',
  tab_model: 'AI Strategy & Insights',
  tab_alpaca: 'Alpaca Brokerage & Sandbox',

  // Subtabs in ModelTab
  subtab_architecture: 'Quantitative Strategy Studio',
  subtab_simulation: 'Strategy & Portfolio Evaluation',
  subtab_tournament: 'Multi-Model Intelligence Consensus',
  subtab_quant_matrix: 'Multi-Factor & Risk Attribution',

  // Overview Tab
  exec_briefing: 'Executive Market Intelligence Briefing',
  exec_briefing_desc: 'Comprehensive market synthesis unifying price action structure, FinBERT sentiment flow, and machine-learning direction bias for informed institutional and retail decision-making.',
  active_asset: 'Active Asset',
  last_close: 'Last Close',
  price_regime: 'Price Structure Regime',
  sentiment_flow: 'FinBERT Sentiment Flow',
  ml_bias: 'Quantitative Direction Bias',
  regime_above_sma: 'Constructive Bullish Structure (Above SMA 20 & 50)',
  regime_below_sma: 'Correction / Defensive Structure (Below MAs)',
  regime_mixed: 'Consolidation / Range-bound Activity',
  sentiment_pos: 'Constructive / Positive Bias',
  sentiment_neg: 'Defensive / Cautious Bias',
  sentiment_neu: 'Neutral / Balanced Bias',
  ml_bias_up: 'Bullish Bias (+1) with high conviction',
  ml_bias_down: 'Bearish Bias (-1) with high conviction',
  ml_bias_flat: 'Neutral Bias (0) - Low directional drift',
  quick_stats: 'Data Inventory & Records',
  stored_data_overview: 'Overview of historical data stores and computed features',
  price_bars_count: 'Stored Price Bars',
  news_count: 'Evaluated Financial News',
  social_count: 'Analyzed Trader Messages',
  technical_count: 'Technical Indicators',
  model_runs_count: 'Strategy Test Iterations',
  sentiment_aggs_count: 'Sentiment Windows',
  sys_diagnostics: 'Pipeline Health & Diagnostics',
  ingestion_history: 'Recent Feed Ingestion Log',
  ingestion_col_provider: 'Provider',
  ingestion_col_type: 'Data Type',
  ingestion_col_items: 'Records',
  ingestion_col_status: 'Status',
  ingestion_col_time: 'Timestamp',
  status_success: 'Success',
  status_failed: 'Failed',
  status_warning: 'Warning',
  no_logs: 'No feed ingestion logs recorded.',
  system_hints: 'Diagnostics & System Recommendations',
  jump_to_tab: 'View Details',

  // Prices Tab
  price_chart_title: 'Price Action & Trading Volume History',
  timeframe: 'Timeframe',
  tf_1w: '1W',
  tf_1m: '1M',
  tf_3m: '3M',
  tf_all: 'ALL',
  export_csv: 'Export CSV',
  metric_period_high: 'Period High',
  metric_period_low: 'Period Low',
  metric_return: 'Period Return',
  metric_avg_volume: 'Avg Daily Volume',
  table_date: 'Date / Time',
  table_open: 'Open',
  table_high: 'High',
  table_low: 'Low',
  table_close: 'Close',
  table_volume: 'Volume',
  bars_loaded: 'bars loaded',
  no_price_bars: 'No price bars recorded for this timeframe.',

  // Technicals Tab
  tech_header_title: 'Technical Indicators & Quantitative Overlays',
  sma_trend_title: '20-Day Trend (SMA 20)',
  rsi_14_title: 'Relative Strength Index (RSI 14)',
  macd_momentum_title: 'MACD Momentum & Signal Line',
  atr_volatility_title: 'Average True Range (ATR 14)',
  price_vs_sma: 'Price Relative to 20-SMA',
  relative_strength_desc: 'Momentum oscillator bounded between 0 and 100',
  macd_div_desc: 'Histogram divergence relative to signal line',
  atr_desc: 'Expected daily market price volatility',
  signal_bullish: 'Bullish',
  signal_bearish: 'Bearish',
  signal_neutral: 'Neutral (30-70)',
  signal_overbought: 'Overbought (>70)',
  signal_oversold: 'Oversold (<30)',
  signal_positive_cross: 'Bullish Crossover',
  signal_negative_cross: 'Bearish Crossover',
  toggle_overlays: 'Chart Overlays & Indicators',
  show_sma20: '20-Day SMA',
  show_sma50: '50-Day SMA',
  show_bb: 'Bollinger Bands (20, 2)',
  chart_price_ma: 'Price & Moving Average Overlays',
  chart_rsi_title: 'RSI Momentum Oscillator',
  chart_macd_title: 'MACD Oscillator & Signal Line',
  legend_close: 'Closing Price',
  legend_sma20: 'SMA 20',
  legend_sma50: 'SMA 50',
  legend_upper_bb: 'Upper Band',
  legend_lower_bb: 'Lower Band',
  legend_macd: 'MACD Line',
  legend_signal: 'Signal Line',
  legend_hist: 'Histogram',
  levels_bound: 'Standard Boundaries: Overbought (70) · Oversold (30)',
  no_tech_data: 'Insufficient price history to compute technical features.',

  // Sentiment Tab
  sentiment_header_title: 'Multi-Horizon Sentiment Telemetry',
  sentiment_composite: 'Composite Polarity Index',
  sentiment_desc: 'AI-driven natural language processing powered by FinBERT across authoritative financial press and social feeds.',
  select_window: 'Analysis Horizon',
  window_hours: 'Hours',
  window_days: 'Days',
  window_24h: '24 Hours (Immediate)',
  window_72h: '72 Hours (Intermediate)',
  window_168h: '7 Days (Macro)',
  desk_vs_retail_title: 'Institutional Sources vs. Retail Community',
  desk_analysts: 'Financial Press & Desk Analysts',
  retail_community: 'Retail Community & Social Channels',
  total_mentions_evaluated: 'Total Mentions Evaluated',
  sentiment_bullish_pct: 'Positive / Bullish Ratio',
  sentiment_neutral_pct: 'Neutral Ratio',
  sentiment_bearish_pct: 'Negative / Bearish Ratio',
  polarity_meter: 'Sentiment Polarity Meter',
  no_sentiment_data: 'No sentiment aggregates found in this horizon.',

  // News Tab
  news_header_title: 'Live Market News & Sentiment Analysis',
  news_search_placeholder: 'Search headlines, summaries, or publishers...',
  news_all_sources: 'All Publishers',
  scrape_fresh_news: 'Refresh Latest News',
  read_full_story: 'Read full story',
  sentiment_tag: 'Sentiment',
  published_by: 'Published by',
  no_news_found: 'No news matching your filter criteria.',
  sentiment_bullish: 'Bullish / Positive',
  sentiment_bearish: 'Bearish / Negative',
  sentiment_neutral: 'Neutral',
  show_original_en: 'Original (English)',
  show_translated_fa: 'Persian Translation',
  auto_translated_badge: 'Persian Translated',
  translate_headlines_ai: 'Translate Headlines',

  // Social Tab
  social_header_title: 'Trader Community & Social Sentiment',
  social_search_placeholder: 'Search messages, authors, or channels...',
  all_channels: 'All Channels',
  channel_reddit: 'Reddit (r/stocks)',
  channel_twitter: 'Financial Twitter (X)',
  channel_telegram: 'Telegram Research',
  view_discussion: 'View Discussion',
  author: 'Author',
  no_social_found: 'No social discussions found.',

  // Model Tab
  model_header_title: 'Algorithmic Forecasting & Strategy Evaluation',
  model_desc: 'Ensemble machine learning models analyze momentum, volume, and sentiment factors to project directional drift.',
  model_prediction_badge: 'Directional Forecast',
  confidence_score: 'Model Confidence',
  target_horizon: 'Forecast Horizon',
  target_horizon_val: 'Next 1 Bar',
  class_probs: 'Class Probability Distribution',
  prob_up_label: 'Bullish Probability',
  prob_flat_label: 'Neutral Probability',
  prob_down_label: 'Bearish Probability',
  top_shap_factors: 'Factor Importance (SHAP Values)',
  shap_desc: 'Marginal contribution of each factor to the final prediction.',
  interactive_simulator_title: 'Strategy Performance & Historical Backtesting',
  simulator_desc: 'Simulate strategy net returns, win rate, and total trades under realistic slippage and exchange fee conditions.',
  sim_param_conf: 'Minimum Entry Confidence',
  sim_param_fee: 'Exchange Fee (Basis Points)',
  sim_param_slip: 'Execution Slippage (BPS)',
  sim_stat_return: 'Net Strategy Return',
  sim_stat_winrate: 'Win Rate',
  sim_stat_trades: 'Executed Trades',
  walk_forward_cv_title: 'Walk-Forward Out-of-Sample Validation',
  cv_desc: 'Out-of-sample performance across sequential periods preventing lookahead bias.',
  col_fold: 'Fold',
  col_train_period: 'Train Window',
  col_test_period: 'Test Window',
  col_accuracy: 'Accuracy',
  col_sharpe: 'Sharpe Ratio',
  col_max_dd: 'Max Drawdown',
  no_model_data: 'No model data available for this asset or timeframe.',

  // Simulation & Portfolio Evaluation
  sim_banner_badge: '$10,000 Portfolio Strategy Engine',
  sim_banner_title: 'Algorithmic Execution & Strategy Evaluation',
  sim_banner_desc: 'Autonomous paper-trading simulation on $10,000 capital incorporating transaction frictions, slippage, and dynamic risk management.',
  btn_run_sim: 'Run Portfolio Evaluation',
  btn_compare_models: 'Compare All Models',
  sim_selected_model: 'Selected Strategy Model:',
  sim_initial_capital: 'Initial Test Capital ($):',
  table_trade_history: 'Execution & Trade Ledger',
  btn_institutional_report: 'Institutional Analysis Report',
  metric_final_balance: 'Ending Portfolio Balance',
  metric_net_profit: 'Net P&L',
  metric_profit_factor: 'Profit Factor',
  metric_max_drawdown: 'Max Drawdown',
  trade_col_action: 'Action',
  trade_col_price: 'Execution Price',
  trade_col_units: 'Position Units',
  trade_col_pnl: 'Realized P&L',
  trade_col_balance: 'Portfolio Balance',
  trade_col_reason: 'Execution Rationale',

  // Model Consensus (Tournament)
  tournament_title: 'Multi-Model Intelligence Consensus',
  tournament_desc: 'Cross-model inference synthesis across frontier neural models and quantitative ensembles for multi-angle outlook validation.',
  btn_run_consensus: 'Update Model Consensus',
  consensus_verdict: 'Consensus Market Outlook',
  model_leader: 'Lead Model for Period',

  // Quantitative Studio (Architecture Lab)
  tab_architecture: 'Quantitative Strategy Studio',
  architecture_desc: 'Design, calibrate parameters, and validate algorithmic strategies alongside frontier AI models.',
  btn_train_model: 'Evaluate & Train Strategy',
  btn_autotune: 'Auto-Calibrate Parameters',
  training_in_progress: 'Simulating historical validation passes...',
  profitable_models: 'Validated Profitable Strategies',
  loss_models: 'Strategies Requiring Optimization',
  why_profit_loss: 'Strategy Performance Attribution & Diagnostics',
  compare_with_llms: 'Benchmark vs Frontier AI Models',
  diagnostics_root_causes: 'Diagnostic Root Causes',
  diagnostics_recommendations: 'Strategy Optimization Plan',
  metric_roi: 'Total Return (ROI)',
  metric_sharpe: 'Sharpe Ratio',
  metric_winrate: 'Win Rate',
  metric_max_dd: 'Max Drawdown',
  metric_train_loss: 'Final Train Loss',
  metric_val_loss: 'Validation Loss',
  metric_accuracy: 'Signal Accuracy',
  rr_ratio_label: 'Risk-to-Reward Ratio (R:R)',
  take_profit_label: 'Take-Profit Target',
  stop_loss_label: 'Stop-Loss Cutoff',
  buy_rsi_label: 'Buy RSI Threshold',
  sell_rsi_label: 'Sell RSI Threshold',
  pos_size_label: 'Position Allocation',
  volatility_gating_label: 'ATR Volatility Gating',
  learning_rate_label: 'Learning Rate',
  dropout_label: 'Dropout Rate',
  l2_reg_label: 'L2 Weight Decay',
  epochs_label: 'Validation Epochs',
  loss_func_label: 'Objective Function',
  optimizer_label: 'Optimizer',
  activation_label: 'Activation Function',
  feature_selection_label: 'Feature Selection',
  // Extended Trading & Signal terminology
  action_buy: 'BUY',
  action_sell: 'SELL',
  action_hold: 'HOLD',
  action_long: 'Long Position',
  action_short: 'Short Position',
  suggested_allocation: 'Position Allocation',
  target_take_profit: 'Target Take Profit',
  risk_stop_loss: 'Risk Stop Loss',
  risk_reward_ratio: 'Risk:Reward Ratio (R:R)',
  key_drivers: 'Key Catalysts & Drivers',
  ai_reasoning: 'AI Chain-of-Thought Rationale',
  latency_ms: 'Inference Latency',
  throughput_tok_sec: 'Throughput (tok/s)',
  tokens_used: 'Tokens Used',
  agreement_score: 'Consensus Agreement',
  synthetic_conviction: 'Strategic Conviction',
  trade_filter_all: 'All Trades',
  trade_filter_buy: 'Buys',
  trade_filter_sell: 'Sells',
  trade_filter_win: 'Winning Trades',
  trade_filter_loss: 'Losing Trades',
  alpha_vs_benchmark: 'Alpha vs Benchmark',
  equity_curve_title: 'Portfolio Equity Growth',
  benchmark_curve: 'Passive Benchmark (Buy & Hold)',
  current_holdings: 'Open Position Value',
  available_cash: 'Available Cash',
  daily_range: '24-Hour Range',
  daily_high: '24h High',
  daily_low: '24h Low',
  current_price: 'Current Price',
  live_status: 'LIVE',
};

export const toEnglishDigits = (input: string | number | null | undefined): string => {
  if (input === null || input === undefined) return '';
  const str = String(input);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str
    .replace(/[۰-۹]/g, (w) => String(persianDigits.indexOf(w)))
    .replace(/[٠-٩]/g, (w) => String(arabicDigits.indexOf(w)));
};

export const toPersianDigits = (input: string | number | null | undefined): string => {
  if (input === null || input === undefined) return '';
  const str = String(input);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str
    .replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)])
    .replace(/[٠-٩]/g, (w) => persianDigits[arabicDigits.indexOf(w)]);
};

export const formatLocalizedNumber = (
  num: number | string | null | undefined,
  language: Language,
  options?: {
    decimals?: number;
    prefix?: string;
    suffix?: string;
    showSign?: boolean;
    useGrouping?: boolean;
  }
): string => {
  if (num === null || num === undefined || num === '') return '—';
  const val = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(val)) return String(num);

  const decimals = options?.decimals ?? 2;
  const useGrouping = options?.useGrouping ?? true;

  let formatted = val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping,
  });

  if (options?.showSign && val > 0) {
    formatted = `+${formatted}`;
  }

  if (language === 'fa') {
    formatted = formatted.replace(/,/g, '٬').replace(/\./g, '٫');
    formatted = toPersianDigits(formatted);
  } else {
    formatted = toEnglishDigits(formatted);
  }

  if (options?.prefix) {
    formatted = `${options.prefix}${formatted}`;
  }
  if (options?.suffix) {
    formatted = `${formatted}${options.suffix}`;
  }

  return formatted;
};

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, defaultText?: string) => string;
  isRtl: boolean;
  toPersianDigits: (input: string | number | null | undefined) => string;
  formatDigits: (input: string | number | null | undefined) => string;
  formatNumber: (
    num: number | string | null | undefined,
    options?: {
      decimals?: number;
      prefix?: string;
      suffix?: string;
      showSign?: boolean;
      useGrouping?: boolean;
    }
  ) => string;
  formatCurrency: (num: number | string | null | undefined, decimals?: number, showSign?: boolean) => string;
  formatPercent: (num: number | string | null | undefined, decimals?: number, showSign?: boolean) => string;
  formatDate: (dateInput: string | number | Date | null | undefined) => string;
  formatRelativeTime: (timeMs: number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('sentrune_language');
    if (saved === 'fa' || saved === 'en') return saved;
    if (typeof navigator !== 'undefined' && navigator.language.startsWith('fa')) {
      return 'fa';
    }
    return 'en';
  });

  const isRtl = language === 'fa';

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('sentrune_language', lang);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'fa' ? 'en' : 'fa');
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', language);
    root.setAttribute('dir', isRtl ? 'rtl' : 'ltr');

    if (isRtl) {
      root.classList.add('font-vazir');
      root.classList.remove('font-latin');
      document.body.classList.add('font-vazir');
      document.body.classList.remove('font-latin');
    } else {
      root.classList.remove('font-vazir');
      root.classList.add('font-latin');
      document.body.classList.remove('font-vazir');
      document.body.classList.add('font-latin');
    }
  }, [language, isRtl]);

  const t = (key: string, defaultText?: string): string => {
    const dict = language === 'fa' ? faTranslations : enTranslations;
    let text = dict[key] || enTranslations[key] || defaultText || key;
    if (language === 'fa') {
      text = toPersianDigits(text);
    } else {
      text = toEnglishDigits(text);
    }
    return text;
  };

  const formatDigits = (input: string | number | null | undefined): string => {
    if (input === null || input === undefined) return '';
    const str = String(input);
    return language === 'fa' ? toPersianDigits(str) : toEnglishDigits(str);
  };

  const formatNumber = (
    num: number | string | null | undefined,
    options?: {
      decimals?: number;
      prefix?: string;
      suffix?: string;
      showSign?: boolean;
      useGrouping?: boolean;
    }
  ): string => formatLocalizedNumber(num, language, options);

  const formatCurrency = (
    num: number | string | null | undefined,
    decimals = 2,
    showSign = false
  ): string => {
    if (num === null || num === undefined || num === '') return '—';
    const val = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(val)) return String(num);
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    const valStr = formatLocalizedNumber(absVal, language, { decimals });

    const sign = isNeg ? '-' : showSign && val > 0 ? '+' : '';
    // Use Unicode LTR marks so that in Persian RTL mode the minus/plus and dollar sign stay intact
    return `\u200E${sign}$${valStr}\u200E`;
  };

  const formatPercent = (num: number | string | null | undefined, decimals = 1, showSign = true): string => {
    if (num === null || num === undefined || num === '') return '—';
    const valStr = formatLocalizedNumber(num, language, { decimals, showSign });
    return language === 'fa' ? `\u200E${valStr}٪\u200E` : `\u200E${valStr}%\u200E`;
  };

  const formatDate = (dateInput: string | number | Date | null | undefined): string => {
    if (!dateInput) return '—';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    if (language === 'fa') {
      const formatted = d.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      return toPersianDigits(formatted);
    }
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (timeMs: number): string => {
    if (!timeMs) return language === 'fa' ? 'نامشخص' : 'unknown';
    const elapsedSec = Math.max(0, Math.floor((Date.now() - timeMs) / 1000));
    if (elapsedSec < 60) return language === 'fa' ? 'هم‌اکنون' : 'just now';
    if (elapsedSec < 3600) {
      const m = Math.floor(elapsedSec / 60);
      return language === 'fa' ? `${toPersianDigits(m)} دقیقه پیش` : `${m} min ago`;
    }
    if (elapsedSec < 86400) {
      const h = Math.floor(elapsedSec / 3600);
      return language === 'fa' ? `${toPersianDigits(h)} ساعت پیش` : `${h} hr ago`;
    }
    const d = Math.floor(elapsedSec / 86400);
    return language === 'fa' ? `${toPersianDigits(d)} روز پیش` : `${d} days ago`;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isRtl,
        toPersianDigits: formatDigits,
        formatDigits,
        formatNumber,
        formatCurrency,
        formatPercent,
        formatDate,
        formatRelativeTime,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
