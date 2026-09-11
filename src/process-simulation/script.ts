import type { SimRun } from './types'

/**
 * 剧本一：软件开发需求交付
 * 项目组织「新一代研发平台项目组」· 工作流「软件需求交付流程」
 * 纯线性 7 个节点（对齐流程定义的能力：没有大节点层级）
 */
export const softwareRun: SimRun = {
  id: 'sim-software',
  org: '新一代研发平台项目组',
  workflow: '软件需求交付流程',
  task: '把「工单智能分派」做成可上线版本，本季度末交付。业务方要求分派准确率不低于 95%。',
  members: [
    {
      id: 'm-pm',
      person: '陈骁',
      org: '研发一部',
      tone: 'blue',
      positions: [
        { id: 'pos-pm', name: '项目经理', assets: ['排期模板', '风险登记规则', '上线评审规则'] },
        { id: 'pos-po', name: '产品经理', assets: ['需求澄清清单', '验收口径规则'] },
      ],
    },
    {
      id: 'm-arch',
      person: '赵岩',
      org: '研发一部',
      tone: 'purple',
      positions: [{ id: 'pos-arch', name: '架构师', assets: ['系统架构约束', '接口设计规范'] }],
    },
    {
      id: 'm-be',
      person: '周航',
      org: '研发一部',
      tone: 'green',
      positions: [{ id: 'pos-be', name: '后端开发', assets: ['编码规范', '单元测试要求'] }],
    },
    {
      id: 'm-fe',
      person: '何静',
      org: '研发二部',
      tone: 'orange',
      positions: [{ id: 'pos-fe', name: '前端开发', assets: ['前端组件规范', '交互一致性检查'] }],
    },
    {
      id: 'm-qa',
      person: '徐峰',
      org: '质量保障部',
      tone: 'ink',
      positions: [{ id: 'pos-qa', name: '测试工程师', assets: ['测试用例基线', '缺陷分级规则'] }],
    },
    { id: 'm-user', person: '你', org: '项目负责人', tone: 'ink', human: true, positions: [] },
  ],
  nodes: [
    {
      id: 'n1',
      actorId: 'm-pm',
      positionId: 'pos-po',
      action: '澄清需求边界',
      dispatch: '分身唤起「产品经理」智能体',
      run: {
        thinking: [
          '从项目经理视角看，硬约束是排期只有 6 周，需求边界必须先收窄',
          '业务方一共提了 3 项诉求，我要判断哪些是本期必须、哪些可以延后',
          '调出产品经理智能体的需求澄清清单，逐条比对验收口径是否可衡量',
        ],
        work: '与业务方对齐后，把「工单智能分派」拆成「分派规则引擎」与「分派执行」两段，人工改派、策略 A/B 实验列为非本期。',
        conclusion: '本期范围锁定：分派规则引擎 + 分派执行链路；人工改派与策略实验不做。',
        risks: ['范围一旦再扩，6 周排期必然延期', '业务方仍保留「人工改派」诉求，需在评审时明确拒绝'],
        handoff: '需要架构师评估：在 6 周约束下规则引擎方案是否可行、工作量多少。',
        artifact: { name: '需求边界确认单', kind: 'doc', summary: '本期范围 / 非本期范围 / 验收口径 3 条' },
      },
    },
    {
      id: 'n2',
      actorId: 'm-arch',
      positionId: 'pos-arch',
      action: '技术可行性评估',
      dispatch: '分身唤起「架构师」智能体',
      inherits: { fromNodeId: 'n1', label: '范围扩张导致排期延期' },
      run: {
        thinking: [
          '已收到项目经理提示的交付延期风险，方案必须一次性定价，不能留返工口子',
          '我的目标是找到一条不增加返工概率的实现路径',
          '把方案拆成「规则引擎」与「分派执行」，分派执行直接复用现有工单服务，避免双线改动',
        ],
        work: '完成可行性评估：规则引擎需新增，分派执行可复用现有工单服务。',
        conclusion: '技术可行。但引入规则引擎会让后端工作量增加约 8 人日，这是本期最大的进度风险。',
        risks: ['后端工作量增加 8 人日，这是本期最大进度风险'],
        handoff: '请项目经理据此重排期；接口契约需前置定义，否则前端会空等。',
        artifact: { name: '技术可行性评估', kind: 'doc', summary: '方案拆解 · 复用点 · 工作量增量 8 人日' },
      },
    },
    {
      id: 'n3',
      actorId: 'm-pm',
      positionId: 'pos-pm',
      action: '收敛排期与契约前置',
      dispatch: '分身唤起「项目经理」智能体',
      inherits: { fromNodeId: 'n2', label: '后端工作量超预期 8 人日' },
      run: {
        thinking: [
          '已收到架构师提示的工作量超预期风险，8 人日无处可挤，只能砍范围',
          '候选砍法是「分派规则配置界面」，改为只读展示 + 配置文件下发',
          '再把接口契约提前到第 1 周冻结，消除前后端串行等待',
        ],
        work: '重排期：砍掉规则配置界面；接口契约提前到第 1 周冻结。',
        conclusion: '排期定稿 6 周；风险登记 2 条（范围、接口契约），责任人已明确。',
        risks: ['接口契约每延迟 1 天，后端开工就顺延 1 天'],
        handoff: '请后端按冻结后的契约开发；请前端同步进入开发，不要等联调。',
        artifact: { name: '需求规格说明书 · 排期计划', kind: 'doc', summary: '6 周排期 · 契约前置 · 风险登记 2 条' },
      },
    },
    {
      id: 'n4',
      actorId: 'm-be',
      positionId: 'pos-be',
      action: '实现规则引擎',
      dispatch: '分身唤起「后端开发」智能体',
      inherits: { fromNodeId: 'n3', label: '接口契约延迟即顺延' },
      run: {
        thinking: [
          '契约已按第 1 周冻结，我按契约实现规则引擎，不再等前端',
          '拆成规则加载、条件求值、分派执行三段，条件求值最容易出错',
          '先为条件求值写单元测试，覆盖规则重叠的边界',
        ],
        work: '完成规则引擎开发，单元测试覆盖率 87%。较计划落后 1 天。',
        conclusion: '规则引擎完成，自测通过；实际进度比基线落后 1 天。',
        risks: ['后端落后 1 天，前端的联调窗口被压缩，后续没有缓冲'],
        handoff: '请前端按冻结契约联调；请测试在联调完成后介入。',
        artifact: { name: '规则引擎代码包', kind: 'code', summary: '3 个模块 · 单测 87% · 12 个接口实现' },
      },
    },
    {
      id: 'n5',
      actorId: 'm-fe',
      positionId: 'pos-fe',
      action: '开发分派看板',
      dispatch: '分身唤起「前端开发」智能体',
      inherits: { fromNodeId: 'n4', label: '后端落后 1 天，联调窗口被压缩' },
      run: {
        thinking: [
          '已收到后端提示的进度落后风险，我的应对是先用 mock 把看板跑通，不等联调',
          '看板要能按工单状态筛选，这是业务方最高频的操作',
          '联调只留 4 个接口，其余本期不用',
        ],
        work: '分派看板开发完成，与后端 4 个接口联调通过。',
        conclusion: '前端看板完成，联调 4/4 通过；未占用额外缓冲时间。',
        risks: ['前后端联调问题若在上线前才暴露，将没有缓冲时间'],
        handoff: '请测试按完整用例集执行，不因进度压力削减用例。',
        artifact: { name: '分派看板前端包', kind: 'code', summary: '4 个页面 · 4 个接口联调通过' },
      },
    },
    {
      id: 'n6',
      actorId: 'm-qa',
      positionId: 'pos-qa',
      action: '执行测试与缺陷闭环',
      dispatch: '分身唤起「测试工程师」智能体',
      inherits: { fromNodeId: 'n5', label: '联调问题无缓冲时间' },
      run: {
        thinking: [
          '已收到项目经理提示的交付延期风险，我的应对是不削减用例、改用优先级排序',
          '主流程回归 32 条必须全跑，边界与异常用例放第二轮',
          '缺陷分级按阻塞级优先，先保证主流程可上线',
        ],
        work: '执行主流程回归 32 条用例，发现缺陷 3 个；其中 1 个阻塞级已同步后端修复并完成回归。',
        conclusion: '主流程通过，阻塞缺陷已闭环。但分派规则的高并发场景尚未验证。',
        risks: ['高并发场景未验证，现有结论不足以支撑上线决策'],
        handoff: '请项目负责人审批是否上线；若要求补充高并发验证，可退回本节点重跑。',
        artifact: { name: '测试报告', kind: 'report', summary: '用例 32 条 · 通过 29 · 缺陷 3（阻塞 1 已闭环）' },
      },
      revisit: {
        thinking: [
          '收到驳回：上线结论缺少高并发场景验证',
          '本轮不重复功能回归，只补做规则引擎压力测试，模拟 500 TPS 并发分派',
          '同时验证规则冲突在并发下是否会复现',
        ],
        work: '执行压力测试：500 TPS 持续 10 分钟，补充并发用例 12 条。',
        conclusion: '压力测试通过：P99 延迟 82ms，无规则错判，补充用例 12 条全部通过。',
        handoff: '请项目负责人基于补充报告重新审批上线。',
        artifact: { name: '压力测试报告', kind: 'report', summary: '500 TPS · P99 82ms · 无错判' },
      },
    },
    {
      id: 'n7',
      actorId: 'm-user',
      positionId: '',
      action: '上线审批',
      dispatch: '',
      confirm: {
        question: '是否批准本次上线？',
        description:
          '上线窗口：本周五 22:00；回滚方案已就绪，回滚耗时约 10 分钟。若驳回，流程将退回「执行测试与缺陷闭环」重新验证。',
        approveLabel: '批准上线',
        rejectLabel: '驳回并退回重测',
        rejectTo: 'n6',
        rejectReason: '上线结论未覆盖规则分派的高并发场景，需补充压力测试后重新提交。',
      },
    },
  ],
  edges: [
    { from: 'n1', to: 'n2', condition: '范围确认' },
    { from: 'n2', to: 'n3', condition: '可行性通过' },
    { from: 'n3', to: 'n4', condition: '排期与契约定稿' },
    { from: 'n4', to: 'n5', condition: '后端自测通过' },
    { from: 'n5', to: 'n6', condition: '联调通过' },
    { from: 'n6', to: 'n7', condition: '测试结论通过' },
    { from: 'n7', to: 'n6', condition: '结论未通过 · 退回重测' },
  ],
  orchestration: {
    summary: '7 个节点已全部解析到人 · 前置校验通过 · 预判 2 处风险',
    steps: [
      {
        id: 'o1',
        title: '解析任务内容',
        thinking: '先把你写的内容拆成可执行要素，后面每一步都对着它走',
        items: [
          { text: '目标', meta: '把「工单智能分派」做成可上线版本' },
          { text: '约束', meta: '本季度末交付；分派准确率不低于 95%' },
          { text: '输入', meta: '已读取任务描述，提取出 2 项硬要求' },
        ],
      },
      {
        id: 'o2',
        title: '对齐工作流',
        thinking: '把任务要素逐项对到这条流程的节点上，确认没有覆盖不到的要求',
        items: [
          {
            text: '流程链路',
            meta: '澄清需求边界 → 技术可行性评估 → 收敛排期 → 实现规则引擎 → 开发分派看板 → 执行测试 → 上线审批',
          },
          { text: '对齐结果', meta: '「准确率 95%」落在执行测试节点；「本季度末交付」落在上线审批节点' },
        ],
      },
      {
        id: 'o3',
        title: '岗位到人（分身解析）',
        thinking: '逐节点确认：需要什么岗位、谁的分身持有该岗位、以哪个岗位身份执行',
        items: [
          { text: '① 澄清需求边界', meta: '需要【产品经理】→ 陈骁 · 其分身持有 2 个岗位智能体' },
          { text: '② 技术可行性评估', meta: '需要【架构师】→ 赵岩' },
          { text: '③ 收敛排期与契约前置', meta: '需要【项目经理】→ 陈骁 · 切换为另一个岗位身份执行' },
          { text: '④ 实现规则引擎', meta: '需要【后端开发】→ 周航' },
          { text: '⑤ 开发分派看板', meta: '需要【前端开发】→ 何静' },
          { text: '⑥ 执行测试与缺陷闭环', meta: '需要【测试工程师】→ 徐峰' },
          { text: '⑦ 上线审批', meta: '需要【项目负责人】→ 你 · 真人介入' },
        ],
      },
      {
        id: 'o4',
        title: '前置校验',
        thinking: '检查这条流程能不能真的跑起来，缺人缺输入就提前报出来，不等到跑到一半才卡住',
        items: [
          { text: '岗位覆盖', meta: '7/7 个节点都有分身持有对应岗位智能体' },
          { text: '执行身份', meta: '陈骁的分身将以「产品经理」「项目经理」两个身份分别执行，不存在冲突' },
          { text: '人工介入点', meta: '1 处（上线审批），流程会在此暂停等你确认' },
        ],
      },
      {
        id: 'o5',
        title: '风险预判',
        thinking: '执行前标出最可能出问题的环节，跑的时候会重点沿着这两条传风险',
        items: [
          { text: '排期风险', meta: '需求范围每扩一项，6 周排期直接失守 —— 重点看「收敛排期与契约前置」' },
          { text: '验证风险', meta: '分派规则的高并发场景容易被漏测 —— 重点看「执行测试与缺陷闭环」' },
        ],
      },
    ],
  },
  conclusion: {
    title: '工单智能分派 · 上线结论',
    points: [
      '范围：分派规则引擎 + 分派执行链路已交付，人工改派按计划延后',
      '质量：功能用例 32 条 + 并发用例 12 条全部通过，阻塞缺陷已闭环',
      '容量：500 TPS 下 P99 延迟 82ms，满足产线当前峰值 3 倍余量',
      '风险：范围、进度、并发验证 3 条登记风险全部关闭，回滚方案可 10 分钟内完成',
    ],
  },
}

/**
 * 剧本二：采购申请与执行
 * 项目组织「供应链管理项目组」· 工作流「采购申请与执行流程」
 * 纯线性 5 个节点；吴倩的分身持有两个岗位智能体，在两处分别以不同岗位执行
 */
export const purchaseRun: SimRun = {
  id: 'sim-purchase',
  org: '供应链管理项目组',
  workflow: '采购申请与执行流程',
  task: '采购 20 台工控机用于产线数据采集，需在 8 月 15 日前到货，预算不超过 40 万元。',
  members: [
    {
      id: 'b-req',
      person: '郑凯',
      org: '制造工程部',
      tone: 'green',
      positions: [{ id: 'pos-eng', name: '工艺工程师', assets: ['产线设备选型规范', '需求提报模板'] }],
    },
    {
      id: 'b-buyer',
      person: '吴倩',
      org: '采购部',
      tone: 'blue',
      positions: [
        { id: 'pos-buyer', name: '采购专员', assets: ['供应商准入名单', '比价规则', '合同审批清单'] },
        { id: 'pos-nego', name: '商务谈判', assets: ['谈判要点库', '价格审批权限'] },
      ],
    },
    {
      id: 'b-tech',
      person: '孙磊',
      org: '技术质量部',
      tone: 'purple',
      positions: [{ id: 'pos-tech', name: '技术评估', assets: ['设备技术规格', '接口符合性清单'] }],
    },
    { id: 'b-user', person: '你', org: '采购负责人', tone: 'ink', human: true, positions: [] },
  ],
  nodes: [
    {
      id: 'p1',
      actorId: 'b-req',
      positionId: 'pos-eng',
      action: '提报采购需求',
      dispatch: '分身唤起「工艺工程师」智能体',
      run: {
        thinking: [
          '产线 8 月底试运行，数据采集工控机必须在 8/15 前到货',
          '数量按 3 条产线 × 6 台，加 2 台备件，共 20 台',
          '接口是硬条件：必须支持 OPC UA，否则和现有 PLC 对接不了',
        ],
        work: '完成需求提报：20 台工控机，支持 OPC UA，8/15 前到货。',
        conclusion: '需求明确：20 台，OPC UA 接口，8/15 前到货。',
        risks: ['8/15 未到货将直接导致产线试运行延期，这是不可让步节点'],
        handoff: '请采购按 8/15 倒排，优先选择有现货的供应商。',
        artifact: { name: '采购需求单', kind: 'doc', summary: '20 台 · OPC UA · 到货节点 8/15' },
      },
    },
    {
      id: 'p2',
      actorId: 'b-buyer',
      positionId: 'pos-buyer',
      action: '询价比价',
      dispatch: '分身唤起「采购专员」智能体',
      inherits: { fromNodeId: 'p1', label: '8/15 到货为不可让步节点' },
      run: {
        thinking: [
          '已收到需求方的到货时效风险，倒排后只剩 5 周，只有有现货的供应商能选',
          '准入名单里 3 家：A 家报价最低但交期 30 天，B、C 家有现货',
          '所以先用交期过滤，再比价，不能反过来只看价格',
        ],
        work: '完成 3 家询价，按交期过滤后有效报价 2 家。',
        conclusion: 'A 家报价最低（低 6%）但交期 30 天，不满足；B 家有现货、报价适中。',
        risks: ['最低价方案 A 家交期 30 天，无法满足 8/15；强行选 A 则试运行必然延期'],
        handoff: '请技术评估核对 B 家型号是否满足 OPC UA 与产线接口要求。',
        artifact: { name: '供应商比价表', kind: 'sheet', summary: '3 家报价 · 交期过滤后 2 家有效' },
      },
    },
    {
      id: 'p3',
      actorId: 'b-tech',
      positionId: 'pos-tech',
      action: '技术符合性评估',
      dispatch: '分身唤起「技术评估」智能体',
      inherits: { fromNodeId: 'p2', label: '最低价方案交期不满足' },
      run: {
        thinking: [
          '已收到采购提示的交期与最低价冲突风险，我不能为赶交期放宽技术标准',
          '逐条核对 B 家型号接口：OPC UA 具备，但需确认固件版本是否支持',
          '同时把 A 家也核一遍，给采购留一个可比的技术结论',
        ],
        work: '完成两家型号的接口符合性核对。',
        conclusion: 'B 家型号满足 OPC UA 与产线接口要求；A 家固件版本不满足，技术不可用。',
        risks: ['A 家技术不符合，最低价方案彻底排除，B 家成为唯一合格供应商，议价空间被压缩'],
        handoff: '请采购在「B 家为唯一技术合格供应商」的前提下谈价，注意价格风险。',
        artifact: { name: '技术评估报告', kind: 'doc', summary: 'B 家合格 · A 家固件不满足' },
      },
    },
    {
      id: 'p4',
      actorId: 'b-buyer',
      positionId: 'pos-nego',
      action: '商务谈判与合同条款确认',
      dispatch: '分身唤起「商务谈判」智能体',
      inherits: { fromNodeId: 'p3', label: '唯一合格供应商，议价空间被压缩' },
      run: {
        thinking: [
          '已收到技术评估的议价空间风险，B 家是唯一合格供应商，筹码在我这边很弱',
          '所以我用交期换价格：接受小幅上浮，但交期必须压下来',
          '另外财务与法务的基线要一起带进谈判：付款按 3-6-1，违约金按公司标准',
        ],
        work: '与 B 家完成谈判，交期由 30 天压到 18 天，价格上浮 6%（约 2.4 万元）。',
        conclusion: '交期满足要求，价格上浮 6%；但供应商给出的违约条款比例低于公司基线。',
        risks: ['价格上浮 2.4 万元超出预算基准，需预算确认', '违约条款低于公司基线，不改不能签'],
        handoff: '请采购负责人审批是否签署；驳回则退回本节点重谈。',
        artifact: { name: '采购合同（待签）', kind: 'contract', summary: '42.4 万 · 交期 18 天 · 3-6-1 · 违约条款待改' },
      },
      revisit: {
        thinking: [
          '收到驳回：供应商不接受修订后的违约条款，谈判需要重开',
          '这次把违约条款作为前置条件，价格不作为交换筹码',
          '条款一旦接受，我要求价格上浮回落到 3% 以内',
        ],
        work: '与 B 家重开谈判，以违约责任条款为先决条件。',
        conclusion: '供应商接受修订后的违约条款；价格上浮收敛至 3%，约 1.2 万元，两项风险均已关闭。',
        handoff: '请采购负责人基于更新后的合同重新审批。',
        artifact: { name: '采购合同（待签）v2', kind: 'contract', summary: '41.2 万 · 交期 18 天 · 3-6-1 · 条款合规' },
      },
    },
    {
      id: 'p5',
      actorId: 'b-user',
      positionId: '',
      action: '合同签署审批',
      dispatch: '',
      confirm: {
        question: '是否批准签署采购合同？',
        description:
          '合同金额 42.4 万元（含 2.4 万溢价），交期 18 天，付款条件 3-6-1，违约条款比例低于公司基线。若驳回，流程将退回「商务谈判与合同条款确认」重新议价。',
        approveLabel: '批准签署',
        rejectLabel: '驳回并退回谈判',
        rejectTo: 'p4',
        rejectReason: '供应商不接受修订后的违约条款，需重新谈判并确认最终报价。',
      },
    },
  ],
  edges: [
    { from: 'p1', to: 'p2', condition: '需求确认' },
    { from: 'p2', to: 'p3', condition: '有效报价确认' },
    { from: 'p3', to: 'p4', condition: '技术结论出具' },
    { from: 'p4', to: 'p5', condition: '条款与价格确认' },
    { from: 'p5', to: 'p4', condition: '条款未通过 · 退回谈判' },
  ],
  orchestration: {
    summary: '5 个节点已全部解析到人 · 前置校验通过 · 预判 2 处风险',
    steps: [
      {
        id: 'q1',
        title: '解析任务内容',
        thinking: '先把你写的内容拆成可执行要素，后面每一步都对着它走',
        items: [
          { text: '目标', meta: '采购 20 台工控机用于产线数据采集' },
          { text: '约束', meta: '8 月 15 日前到货；预算不超过 40 万元；需支持 OPC UA' },
          { text: '输入', meta: '已读取任务描述，提取出 3 项硬要求' },
        ],
      },
      {
        id: 'q2',
        title: '对齐工作流',
        thinking: '把任务要素逐项对到这条流程的节点上，确认没有覆盖不到的要求',
        items: [
          { text: '流程链路', meta: '提报采购需求 → 询价比价 → 技术符合性评估 → 商务谈判与合同条款确认 → 合同签署审批' },
          { text: '对齐结果', meta: '「8/15 到货」落在询价比价节点；「预算 40 万」落在商务谈判节点' },
        ],
      },
      {
        id: 'q3',
        title: '岗位到人（分身解析）',
        thinking: '逐节点确认：需要什么岗位、谁的分身持有该岗位、以哪个岗位身份执行',
        items: [
          { text: '① 提报采购需求', meta: '需要【工艺工程师】→ 郑凯' },
          { text: '② 询价比价', meta: '需要【采购专员】→ 吴倩 · 其分身持有 2 个岗位智能体' },
          { text: '③ 技术符合性评估', meta: '需要【技术评估】→ 孙磊' },
          { text: '④ 商务谈判与合同条款确认', meta: '需要【商务谈判】→ 吴倩 · 切换为另一个岗位身份执行' },
          { text: '⑤ 合同签署审批', meta: '需要【采购负责人】→ 你 · 真人介入' },
        ],
      },
      {
        id: 'q4',
        title: '前置校验',
        thinking: '检查这条流程能不能真的跑起来，缺人缺输入就提前报出来，不等到跑到一半才卡住',
        items: [
          { text: '岗位覆盖', meta: '5/5 个节点都有分身持有对应岗位智能体' },
          { text: '执行身份', meta: '吴倩的分身将以「采购专员」「商务谈判」两个身份分别执行，不存在冲突' },
          { text: '人工介入点', meta: '1 处（合同签署审批），流程会在此暂停等你确认' },
        ],
      },
      {
        id: 'q5',
        title: '风险预判',
        thinking: '执行前标出最可能出问题的环节，跑的时候会重点沿着这两条传风险',
        items: [
          { text: '时效风险', meta: '最低价供应商交期不满足 8/15 —— 重点看「询价比价」' },
          { text: '合规风险', meta: '合同违约条款可能低于公司基线 —— 重点看「商务谈判与合同条款确认」' },
        ],
      },
    ],
  },
  conclusion: {
    title: '工控机采购 · 签署结论',
    points: [
      '供应商：B 家（唯一技术合格且满足 8/15 到货节点）',
      '交期：18 天，产线试运行节点可控',
      '金额：41.2 万元，溢价经重新谈判收敛至 1.2 万元',
      '条款：付款 3-6-1，违约责任按公司基线修订，合规通过',
    ],
  },
}

export const simulationRuns: SimRun[] = [softwareRun, purchaseRun]
