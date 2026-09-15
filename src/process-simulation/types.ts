/**
 * 流程仿真 V2 · 数据模型
 *
 * 说明：本模块为纯演示 Demo，全部数据虚拟，不与现有原型数据对齐。
 * 逻辑底座：数字分身（人）持有 1..N 个岗位智能体；工作流按岗位编排节点；
 *          节点执行时由分身唤起对应岗位智能体，执行标准来自该智能体的基础配置。
 *
 * V2 与 V1 的唯一差别：每个节点多了一段「沟通过程」——
 * 数字分身派活给子代理（岗位智能体）时的往返报文。默认先播这段，再播执行过程。
 */

/** 岗位智能体（分身可调用的能力） */
export type SimPositionAgent = {
  id: string
  /** 岗位名，如「项目经理」 */
  name: string
  /** 该岗位智能体的基础配置摘要，用于「分身调度」事件展示 */
  assets: string[]
}

/** 参与人 = 一个数字分身，持有 1..N 个岗位智能体 */
export type SimMember = {
  id: string
  person: string
  /** 人的职级/所属，展示用 */
  org: string
  /** 分身持有的岗位智能体（一人可多岗） */
  positions: SimPositionAgent[]
  tone: 'blue' | 'green' | 'purple' | 'orange' | 'ink'
  /** 是否为真人（需要人工介入的角色） */
  human?: boolean
}

/** 大节点（阶段）—— 流程定义中没有这层，已移除。流程为纯线性节点序列。 */

export type SimNodeStatus = 'pending' | 'running' | 'awaiting' | 'done' | 'rejected'

export type SimArtifact = {
  name: string
  kind: 'doc' | 'sheet' | 'slide' | 'code' | 'contract' | 'report'
  summary: string
}

/**
 * 沟通过程中的一轮报文。
 * from: twin = 数字分身说的；agent = 岗位智能体说的；you = 数字分身向「你」发问
 */
export type SimExchangeTurn = {
  from: 'twin' | 'agent' | 'you'
  text: string
  /** 当 from === 'you' 时：数字分身向你提出的选择题选项 */
  options?: string[]
}

/** 节点一次执行的内容 */
export type SimRunContent = {
  /**
   * 沟通过程：数字分身与它的子代理（岗位智能体）之间的往返。
   * 时序在执行过程之前 —— 先交接，再干活。
   * 硬要求：① 派单时要转达上游分身传来的信息 ② 子代理要真的提出异议或澄清，不能一味应承
   */
  exchange: SimExchangeTurn[]
  /**
   * 子代理受理任务时给出的执行计划（有交付物的节点才有）。
   * 在沟通过程里以「任务列表」呈现，随节点执行推进逐条打勾、划掉。
   */
  tasks?: string[]
  /** 思维链，逐条流式展示 */
  thinking: string[]
  /** 本节点做了什么 */
  work: string
  /** 结论 */
  conclusion: string
  /** 本次给出的风险提示（会被下游节点的 inherits 承接） */
  risks?: string[]
  /** 需要下面岗位做什么 */
  handoff?: string
  /** 交付物 */
  artifact?: SimArtifact
}

/** 人工介入（阻塞式确认卡） */
export type SimConfirm = {
  question: string
  description: string
  approveLabel: string
  rejectLabel: string
  /** 驳回后回退到的节点 id */
  rejectTo: string
  /** 驳回理由，回退时会作为下游节点的承接内容展示 */
  rejectReason: string
}

export type SimNode = {
  id: string
  /** 执行人的分身 id */
  actorId: string
  /** 本次以哪个岗位身份执行（必须是该分身持有的岗位之一） */
  positionId: string
  /** 动作名，用于流程图与标题 */
  action: string
  /** 「分身唤起岗位智能体」的显式调度事件 */
  dispatch: string
  /** 承接上游风险：fromNodeId 是风险来源节点 */
  inherits?: { fromNodeId: string; label: string }
  /** 首次执行内容（人工介入节点无执行内容） */
  run?: SimRunContent
  /** 回退后重跑使用的内容（缺省则重跑 run） */
  revisit?: SimRunContent
  /** 同值节点并行执行（当前两套剧本均为纯线性，未使用；保留能力） */
  parallelGroup?: string
  /** 人工介入 */
  confirm?: SimConfirm
  /** 人工介入节点的沟通过程：分身向「你」请示（无执行内容，所以对话挂在这里） */
  confirmExchange?: SimExchangeTurn[]
}

export type SimEdge = { from: string; to: string; condition: string }

/** 编排阶段的一步（点发送后、真正开始执行前） */
export type SimOrchestrationStep = {
  id: string
  title: string
  /** 这一步的思考，一行 */
  thinking: string
  items: { text: string; meta: string }[]
}

/**
 * 任务编排：点「发送任务」后先跑这一段，再进入节点执行。
 * 内容必须是真动作 —— 解析任务内容、对齐工作流、把岗位解析到人、前置校验、风险预判。
 * 不复述「已确定流程 / 已确定人员」这类既定事实。
 */
export type SimOrchestration = {
  /** 收起后的一行摘要 */
  summary: string
  steps: SimOrchestrationStep[]
}

/** 完整的一条工作流（= 选择执行流程的选项） */
export type SimRun = {
  id: string
  /** 所属项目组织 */
  org: string
  /** 工作流名称 */
  workflow: string
  /** 预置的任务内容 */
  task: string
  members: SimMember[]
  nodes: SimNode[]
  edges: SimEdge[]
  orchestration: SimOrchestration
  /** 全流程结论 */
  conclusion: { title: string; points: string[] }
}
