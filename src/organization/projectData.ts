import { knownA2AMembers, type A2AConversation, type A2AConversationMessage } from '../assistant/a2aConversationTypes'

export type ProjectTask = {
  id: string; title: string; owner: string; due: string; priority: '高' | '中';
  initialStatus: 'pending' | 'progress' | 'completed'; goal: string;
  memberIndexes: number[]; replies: string[]; result: string;
}
export type Project = { id: string; title: string; description: string; tone: 'blue' | 'violet' | 'orange' | 'green'; tasks: ProjectTask[] }
export const projects: Project[] = [
  { id: 'production', title: '生产', description: '围绕总装节拍、工位齐套和生产排程开展协同。', tone: 'blue', tasks: [
    { id: 'production-plan', title: '下周总装排程确认', owner: '李四', due: '9月14日', priority: '中', initialStatus: 'pending', memberIndexes: [0,1,2], goal: '确认下周三个总装工位的开工顺序，形成物料齐套表和放行检查安排。', replies: ['生产计划已核对：A、B 工位按周一和周二顺序开工，C 工位需等线束齐套，建议预留半天缓冲。','根据生产顺序，供应链会先配送 A、B 工位物料；C 工位线束周二 12:00 前到线，王五负责回传签收记录。','按前两位的安排，质量在各工位开工前完成首件检查；C 工位需核实线束检验记录，未经放行不能开工。'], result: '排程确认单：李四维护开工顺序，王五回传物料签收，陈工完成开工放行检查；周一 09:00 前完成首批确认。' },
    { id: 'production-shortage', title: '总装工位线束缺件协调', owner: '李四', due: '9月12日', priority: '高', initialStatus: 'progress', memberIndexes: [0,1,2], goal: '解决 B 工位两套线束缺件，明确补料时间和不影响质量的工序调整方案。', replies: ['B 工位缺两套线束，原计划明天 10:00 装配。可先完成支架检查，但线束安装后的测试不能提前。','承接生产窗口，已协调两套线束加急，明天 08:30 到线；王五跟踪运输并在今晚 18:00 更新节点。','同意先做支架检查；线束到线后须核对批次及合格证明，再由陈工签署检验记录后安装。'], result: '缺件处置清单：今晚 18:00 更新运输节点，明天 08:30 补齐两套线束；李四调整工序，陈工检验放行。' },
    { id: 'production-handoff', title: '夜班装配交接记录闭环', owner: '李四', due: '9月10日', priority: '中', initialStatus: 'completed', memberIndexes: [0,2], goal: '补齐夜班装配交接中的扭矩复核记录，确认白班可继续作业。', replies: ['夜班交接遗漏了三处扭矩复核签字，李四已安排原操作人员补充原始测量记录。','已复核三处记录与工具校准状态，数值符合工艺要求；交接清单已签署，白班可以接续作业。'], result: '三处扭矩记录已补齐并复核，交接清单已归档，白班恢复作业。' },
  ] },
  { id: 'supply', title: '供应链', description: '协同供应商交付、替代物料与到货检验，保障齐套。', tone: 'violet', tasks: [
    { id: 'supply-alternative', title: '替代紧固件齐套确认', owner: '王五', due: '9月15日', priority: '中', initialStatus: 'pending', memberIndexes: [1,3,2], goal: '评估替代紧固件能否用于当前批次，形成规格核对、适用范围和检验要求。', replies: ['原规格紧固件缺 80 件，候选替代件库存充足；王五提供材料牌号、规格和供应商合格证明。','对照采购资料，尺寸相同但表面处理不同，刘工要求先完成适用性评估，暂不能直接替换。','承接设计意见，陈工安排涂层与防腐资料核查；批准记录和检验结论齐备后才可办理入库放行。'], result: '替代评估清单：王五补齐证明，刘工确认适用性，陈工完成检验；批准前保持原料号受控。' },
    { id: 'supply-delay', title: '关键供应商交付延期处置', owner: '王五', due: '9月12日', priority: '高', initialStatus: 'progress', memberIndexes: [1,0,2], goal: '处置液压支架供应商延期两天的风险，明确分批交付与生产调整方案。', replies: ['供应商热处理工序延误两天。可将首批 12 件提前至明晚发运，其余 18 件后天补齐，王五负责跟踪。','首批 12 件能覆盖 A 工位需求；李四将 B 工位支架安装后移一天，其他已具备条件的作业继续。','按分批交付安排，两批都须独立提供热处理报告；陈工分别检验，不能以首批结论替代第二批放行。'], result: '延期处置方案：首批 12 件保障 A 工位，余下 18 件后天补齐；王五跟踪交付、李四调整 B 工位、陈工分批检验。' },
    { id: 'supply-receipt', title: '到货批次证书补齐', owner: '王五', due: '9月10日', priority: '中', initialStatus: 'completed', memberIndexes: [1,2], goal: '补齐两批密封件的合格证与批次追溯资料，完成受控入库。', replies: ['已收到供应商补发的两批合格证，批号分别与箱单和实物标签一致。','已核验合格证、批次及有效期，两批密封件检验合格，入库记录已关联证书。'], result: '两批密封件证书核验完成，追溯资料与入库记录关联，受控入库完成。' },
  ] },
  { id: 'quality', title: '质量', description: '跟踪装配不符合项、重复缺陷与整改验证。', tone: 'green', tasks: [
    { id: 'quality-repeat', title: '重复划伤缺陷原因分析', owner: '陈工', due: '9月15日', priority: '中', initialStatus: 'pending', memberIndexes: [2,0,3], goal: '分析同区域三次表面划伤，区分搬运、工装和装配因素，提出验证计划。', replies: ['三次划伤位置接近，陈工已整理缺陷照片和检验时间线，优先排查工装接触面。','结合质量时间线，李四发现同一周转架参与三次转运，现已隔离该周转架并保留接触面样本。','基于隔离结果，刘工建议加装软质防护并做三次转运验证，确认不影响支撑位置后再固化工艺。'], result: '原因验证计划：隔离周转架、增加防护、完成三次转运复验；陈工确认效果后关闭纠正措施。' },
    { id: 'quality-ncr', title: '装配间隙不符合项整改', owner: '陈工', due: '9月12日', priority: '高', initialStatus: 'progress', memberIndexes: [2,3,0], goal: '处置舱门装配间隙超差，明确设计处理意见、现场返工和复检证据。', replies: ['右上角间隙超出工艺上限，已开具不符合项并暂停该部位后续作业，陈工提供测量原始记录。','根据实测位置，刘工建议调整两处垫片并复测全周间隙；未经批准不得打磨结构件。','按设计意见，李四安排具备资质人员调整垫片，返工后提交全周测量表，由质量复检后恢复作业。'], result: '整改任务单：刘工批准垫片调整方案，李四执行返工，陈工复检全周间隙并留存记录；合格后恢复作业。' },
    { id: 'quality-tool', title: '量具超期影响排查', owner: '陈工', due: '9月9日', priority: '高', initialStatus: 'completed', memberIndexes: [2,0], goal: '排查一把超期量具涉及的产品批次，完成复测与记录追溯。', replies: ['已隔离超期量具，追溯发现涉及六件产品，需要使用有效量具重新测量。','李四已安排六件产品复测，结果均满足要求，复测记录和原测量记录已逐件关联。'], result: '六件产品复测合格，影响范围已确认；量具隔离送检，质量记录归档。' },
  ] },
  { id: 'engineering', title: '研发', description: '组织设计变更评估、接口核对与试验问题关闭。', tone: 'orange', tasks: [
    { id: 'engineering-test', title: '环境试验复测计划评审', owner: '刘工', due: '9月16日', priority: '中', initialStatus: 'pending', memberIndexes: [3,2,0], goal: '确认温度循环异常的复测条件、样件配置和见证要求。', replies: ['刘工梳理到异常出现在低温稳定段，复测需锁定软件版本、传感器位置和保温时间。','按设计条件，陈工补充温度测量链校准记录和见证点，复测原始曲线必须完整保存。','李四可在周三提供两套一致配置样件，完成配置核验后交试验组，避免混用不同状态样件。'], result: '复测计划：周三交付两套样件，锁定配置和温度条件；质量见证，设计评审完整原始曲线。' },
    { id: 'engineering-change', title: '线束走向变更影响评估', owner: '刘工', due: '9月13日', priority: '高', initialStatus: 'progress', memberIndexes: [3,0,2], goal: '评估线束走向调整对安装空间、生产作业和检验的影响，形成变更实施边界。', replies: ['刘工建议线束绕开支架锐边，最小弯曲半径保持原要求；请生产核查现场工具空间。','李四验证新走向需要调整两个卡箍位置，现有工具可达；已装机产品需单独安排返工作业。','承接设计和生产意见，陈工要求变更后检查间距、防磨和连接器锁紧；存量与新增产品分别留检验记录。'], result: '变更影响清单：刘工更新图纸，李四区分新增与返工范围，陈工补充防磨及锁紧检查；批准后实施。' },
    { id: 'engineering-interface', title: '设备接口清单冻结', owner: '刘工', due: '9月10日', priority: '中', initialStatus: 'completed', memberIndexes: [3,1,2], goal: '完成设备供电与数据接口核对，冻结采购和验证使用的接口清单。', replies: ['刘工已完成电压、连接器和数据协议核对，清单中三处歧义已澄清。','王五已与供应商逐项确认接口清单，采购技术附件按冻结版本执行。','陈工确认接口验证条目与冻结清单一致，后续变更需走受控审批。'], result: '接口清单已冻结，采购附件及验证条目同步，版本变更纳入受控管理。' },
  ] },
]
export const conversationIdFor = (task: ProjectTask) => `project-a2a-${task.id}`
export function taskStatus(task: ProjectTask, conversation?: A2AConversation): ProjectTask['initialStatus'] {
  if (!conversation) return task.initialStatus
  if (conversation.status === 'completed') return 'completed'
  if (conversation.status === 'delivered' || conversation.pendingCurrentUserConfirmation?.id === `start-${task.id}`) return 'pending'
  return 'progress'
}
export const projectConversations: A2AConversation[] = projects.flatMap(project => project.tasks.map(task => {
  const id = conversationIdFor(task)
  const members = task.memberIndexes.map(index => knownA2AMembers[index])
  const pending = task.initialStatus === 'pending', done = task.initialStatus === 'completed'
  const messages: A2AConversationMessage[] = pending ? [] : [
    { id: `${id}-goal`, conversationId: id, actorUserId: 'current-user', actorName: '张三', origin: 'initiator_twin', content: task.goal, sequence: 1, createdAt: '09:00' },
    ...members.map((member, i) => ({ id: `${id}-reply-${i}`, conversationId: id, actorUserId: member.userId, actorName: member.name, origin: 'participant_twin' as const, content: task.replies[i], sequence: i + 2, createdAt: `09:0${i+1}` })),
    ...(done ? [{ id: `${id}-result`, conversationId: id, actorUserId: 'current-user', actorName: '张三', origin: 'initiator_twin' as const, content: task.result, sequence: members.length + 2, createdAt: '09:10' }] : []),
  ]
  return {
    id, title: task.title, scope: 'group', mechanism: 'collaboration', status: done ? 'completed' : 'waiting_user_confirmation',
    hostUserId: 'current-user', hostName: '张三', perspective: 'initiator', members, speakingOrder: members.map(m => m.userId),
    goal: task.goal, round: 1, expectedReplyCount: members.length, repliedCount: pending ? 0 : members.length,
    createdAt: '9月11日 09:00', updatedAt: done ? '已归档' : '今天', preview: pending ? '待确认启动协作' : done ? task.result : '各岗位意见已收齐，待确认处置方案',
    demo: { messages, replies: Object.fromEntries(members.map((m,i) => [m.userId, task.replies[i]])), completionSummary: task.result },
    pendingCurrentUserConfirmation: done ? undefined : {
      id: pending ? `start-${task.id}` : `review-${task.id}`, question: pending ? `开始“${task.title}”协作？` : '确认本次处置方案并完成协作？', description: pending ? task.goal : task.result,
      resumeStatus: pending ? 'delivered' : 'response_received', resumePreview: pending ? '待开始' : '意见已收齐',
      choices: pending ? [{ id: 'start', label: '开始协作', description: '由你的分身发起，参与分身按顺序反馈。', commandAction: 'send', commandContent: task.goal }] : [
        { id: 'complete', label: '确认方案并完成', description: '记录处置方案及责任分工，完成本次协作。', commandAction: 'complete', commandContent: task.result },
        { id: 'continue', label: '继续核对', description: '请各岗位再次核对约束与交付安排。', commandAction: 'send', commandContent: `请再次核对：${task.goal}` },
      ],
    },
  } satisfies A2AConversation
}))
