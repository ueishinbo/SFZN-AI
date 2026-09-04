import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileStack,
  FileText,
  GitBranch,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  PenLine,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { roleAssetCatalog, type RoleAssetId } from './roleAssetCatalog'
import './role-assets.css'

const processNodes = [
  { id: 'input', name: '客户需求输入', owner: '客户经理', input: '客户目标、业务材料、初始范围', output: '需求线索', responsibility: '接收并判断是否进入正式澄清' },
  { id: 'clarify', name: '需求澄清', owner: '解决方案经理', input: '需求线索、客户材料', output: '需求澄清清单', responsibility: '明确目标、范围、验收口径与不可妥协边界' },
  { id: 'design', name: '方案设计', owner: '解决方案经理', input: '确认后的需求', output: '解决方案建议书', responsibility: '完成业务架构、能力组合、工作量与风险设计' },
  { id: 'review', name: '方案评审', owner: '评审小组', input: '方案建议书、风险清单', output: '评审结论', responsibility: '组织评审、闭环意见并确认可交付性' },
  { id: 'delivery', name: '方案交付', owner: '项目经理', input: '已通过方案', output: '交付物与验收材料', responsibility: '向交付团队移交上下文并支持关键节点' },
  { id: 'review-back', name: '验收与复盘', owner: '解决方案经理', input: '验收结果、问题记录', output: '复盘结论与案例', responsibility: '沉淀可复用经验并补充岗位资产' },
]

type KnowledgeItem = { id: string; name: string; type: string; scene: string; summary: string }

const initialKnowledgeItems: KnowledgeItem[] = [
  { id: 'delivery-policy', name: '交付项目管理办法.pdf', type: '制度', scene: '项目启动、交付与验收', summary: '明确项目分级、交付里程碑和验收要求。' },
  { id: 'data-security', name: '项目数据安全管理规定.pdf', type: '制度', scene: '材料读取与对外发送', summary: '规定敏感数据读取、引用、脱敏和外发边界。' },
  { id: 'requirement-method', name: '客户需求澄清方法.docx', type: '方法', scene: '需求模糊或参与方较多', summary: '从目标、范围、角色、约束和验收口径五方面澄清需求。' },
  { id: 'review-check', name: '方案评审检查单.xlsx', type: '检查单', scene: '正式评审前自检', summary: '覆盖完整性、依据、可交付性、风险和权限边界。' },
  { id: 'aviation-terms', name: '航空制造业务术语表.xlsx', type: '业务知识', scene: '业务建模与材料编写', summary: '统一制造、质量、供应链等常用业务术语。' },
]

const cases = [
  {
    id: 'aviation-kb', title: '航空制造知识库建设方案', category: '知识工程', duration: '12 周', result: '完成试点验收', context: '某制造业务团队的制度、工艺文件和历史问题分散，业务人员难以快速找到可信答案。', goal: '建设带权限控制和来源追溯的岗位知识库，并完成两个业务场景试点。', constraints: ['材料格式不统一，历史文档存在重复内容', '敏感工艺资料不能跨权限范围检索', '试点周期只有 12 周'], decisions: ['先按高频问题建立最小知识范围', '所有回答必须显示原始来源', '敏感内容采用权限过滤后再检索'], outputs: ['知识分类与字段规范', '试点知识库', '权限矩阵', '验收测试报告'], lessons: '不要一开始追求全量知识覆盖。先用高频任务验证知识质量、权限和引用链路，再扩大范围。',
  },
  {
    id: 'assistant-delivery', title: '企业智能助理解决方案交付', category: 'AI 应用', duration: '8 周', result: '完成首批用户试用', context: '客户希望使用统一智能助理处理制度查询、材料生成和任务协同，但不同部门流程差异较大。', goal: '完成统一入口、三个高频场景和受控动作确认机制的方案设计。', constraints: ['场景口径尚未统一', '外部动作必须由用户确认', '首期不允许大范围改造业务系统'], decisions: ['先做查询与材料生成，再接入受控动作', '所有正式动作使用结构化确认卡', '用预置 Demo 场景验证价值'], outputs: ['总体解决方案', '场景优先级清单', '交互原型', '试点实施计划'], lessons: 'AI 能力描述必须落到具体业务任务；“可以做什么”不如“在哪一步帮助谁完成什么”清楚。',
  },
  {
    id: 'twin-pilot', title: '数字分身训练场内部试点', category: '产品试点', duration: '6 周', result: '形成讨论版原型', context: '组织希望让智能助理逐步理解人员岗位、个人工作方式和上下文，但 role、soul、memory 边界尚未统一。', goal: '通过可交互原型明确三个对象、个人与后台边界以及岗位资产的组织方式。', constraints: ['暂不设计训练质量评测', '每个人只启用一个岗位', '个人内容默认私有'], decisions: ['role、soul、memory 并列创建', '公共岗位集与我的补充分层', '模型提炼结果由用户确认后生效'], outputs: ['个人训练中心原型', '岗位集管理原型', '产品说明文档'], lessons: '先让用户看见真实内容和完整路径，再讨论抽象的数据模型与评测体系。',
  },
]

const templates = [
  { id: 'clarify', title: '客户需求澄清清单', type: '表单', process: '需求澄清', updated: '今天更新', sections: ['客户目标与成功标准', '业务范围与不包含范围', '关键参与人及决策人', '现有系统与数据条件', '验收口径与时间要求'] },
  { id: 'proposal', title: '解决方案建议书模板', type: '文档', process: '方案设计', updated: '昨天更新', sections: ['项目背景与问题定义', '总体方案与业务架构', '能力清单与边界', '实施计划与工作量', '风险、依赖与验收标准'] },
  { id: 'review', title: '方案评审检查表', type: '表格', process: '方案评审', updated: '8 月 29 日', sections: ['需求覆盖完整性', '数据和事实依据', '方案可交付性', '安全与权限边界', '风险及缓解动作'] },
  { id: 'acceptance', title: '项目交付验收单', type: '表单', process: '方案交付', updated: '8 月 28 日', sections: ['交付物清单', '验收环境', '验收结果', '遗留问题', '客户确认'] },
]

const roleRules = [
  { title: '不得替代组织授权', detail: 'role 可以理解岗位工作，但不能绕过当前用户权限访问或操作业务系统。', scope: '全部工作场景' },
  { title: '正式动作必须确认', detail: '派任务、催办、修改业务数据和对外发送材料前必须获得用户明确确认。', scope: '外部动作' },
  { title: '事实必须可追溯', detail: '引用制度、项目数据和业务结论时展示来源；依据不足时明确说明。', scope: '查询、分析与材料生成' },
  { title: '敏感材料不得扩散', detail: '个人材料和受限项目内容只能在授权范围内使用，不得进入公共岗位资产。', scope: '材料使用' },
  { title: '岗位职责不可由个人覆盖', detail: '“我的补充”可以增加经验和方法，但不能删除组织定义的正式职责。', scope: 'role 维护' },
  { title: '模型抽取需人工确认', detail: '从对话或文件抽取的岗位内容必须由管理员确认后才进入公共岗位集。', scope: '后台配置' },
]

function RoleDescriptionDocument() {
  return <article className="role-asset-document"><header><small>COMAC · 公共岗位集</small><h1>解决方案经理岗位说明书</h1><p>岗位编码 ROLE-SOL-001 · 适用范围：公司级 · 岗位负责人：刘敏</p></header><section><h2>一、岗位目标</h2><p>连接客户业务问题与公司产品能力，形成有依据、可评审、可交付的解决方案，并确保关键业务上下文完整传递给实施团队。</p></section><section><h2>二、核心职责</h2><ol><li>组织客户需求澄清，明确目标、范围、约束和验收口径。</li><li>完成业务架构、能力组合、实施路径与风险设计。</li><li>组织方案评审并闭环业务、产品、技术和交付意见。</li><li>向项目团队移交方案上下文，支持关键交付和验收节点。</li><li>沉淀标准模板、任务案例和可复用业务知识。</li></ol></section><div className="role-asset-document-grid"><section><h2>三、主要交付物</h2><ul><li>需求澄清清单</li><li>解决方案建议书</li><li>方案评审材料</li><li>风险与依赖清单</li><li>交付上下文说明</li></ul></section><section><h2>四、权限边界</h2><ul><li>可读取已授权的客户与项目资料</li><li>不可替代项目负责人批准范围或预算</li><li>对外材料发送前必须取得确认</li><li>敏感数据必须按制度脱敏</li></ul></section></div><section><h2>五、上下游关系</h2><div className="role-asset-relations"><span>上游：客户经理、业务负责人</span><ChevronRight size={16} /><strong>解决方案经理</strong><ChevronRight size={16} /><span>下游：产品经理、项目经理、交付团队</span></div></section></article>
}

function CapabilityModel() {
  const [selectedId, setSelectedId] = useState('clarify')
  const selected = processNodes.find((item) => item.id === selectedId) ?? processNodes[1]
  return <div className="role-capability-layout"><section><header><span>C 大脑业务模型</span><h2>解决方案价值流</h2><p>模型编码 CB-SOLUTION-018 · 当前岗位绑定 5 个核心过程</p></header><div className="role-capability-flow">{processNodes.map((item, index) => <div key={item.id}><button className={selectedId === item.id ? 'active' : ''} type="button" onClick={() => setSelectedId(item.id)}><small>0{index + 1}</small><strong>{item.name}</strong><span>{item.owner}</span></button>{index < processNodes.length - 1 && <ChevronRight size={17} />}</div>)}</div></section><aside><span>PROCESS DETAIL</span><h3>{selected.name}</h3><dl><div><dt>过程负责人</dt><dd>{selected.owner}</dd></div><div><dt>输入</dt><dd>{selected.input}</dd></div><div><dt>输出</dt><dd>{selected.output}</dd></div><div><dt>当前岗位职责</dt><dd>{selected.responsibility}</dd></div></dl><footer><Layers3 size={15} />已关联 4 项知识、2 份模板、3 个案例</footer></aside></div>
}

function KnowledgeTable({ items = initialKnowledgeItems, editable = false, onEdit, onDelete }: { items?: KnowledgeItem[]; editable?: boolean; onEdit?: (item: KnowledgeItem) => void; onDelete?: (id: string) => void }) {
  return <section className={`role-knowledge-table ${editable ? 'is-editable' : ''}`}><header><div><span>岗位知识字段</span><h2>解决方案经理知识地图</h2><p>以文件为单位维护岗位知识，并标注类型和适用场景。</p></div></header><div className="role-knowledge-head"><span>知识文件</span><span>类型</span><span>适用场景</span><span>内容摘要</span>{editable && <span>操作</span>}</div>{items.map((item) => <article key={item.id}><div><FileText size={16} /><strong>{item.name}</strong></div><span>{item.type}</span><span>{item.scene}</span><p>{item.summary}</p>{editable && <div className="role-knowledge-actions"><button type="button" onClick={() => onEdit?.(item)}>编辑</button><button type="button" onClick={() => onDelete?.(item.id)}>删除</button></div>}</article>)}</section>
}

function CaseLibrary() {
  const [selectedId, setSelectedId] = useState(cases[0].id)
  const selected = cases.find((item) => item.id === selectedId) ?? cases[0]
  return <div className="role-case-layout"><aside><header><span>STANDARD PROJECT CASES</span><h2>历史任务案例</h2><p>已脱敏的标准项目情况与完整上下文。</p></header>{cases.map((item) => <button className={selected.id === item.id ? 'active' : ''} type="button" key={item.id} onClick={() => setSelectedId(item.id)}><FileText size={17} /><span><strong>{item.title}</strong><small>{item.category} · {item.duration}</small></span><ChevronRight size={15} /></button>)}</aside><article className="role-case-markdown"><header><div><span>MARKDOWN · 只读</span><h1>{selected.title}.md</h1><p>{selected.category} · 周期 {selected.duration} · {selected.result}</p></div><em><LockKeyhole size={13} />公共岗位资产</em></header><section><h2># 项目背景</h2><p>{selected.context}</p><h2># 项目目标</h2><p>{selected.goal}</p><h2># 关键约束</h2>{selected.constraints.map((item) => <p key={item}>- {item}</p>)}<h2># 关键决策</h2>{selected.decisions.map((item) => <p key={item}>- {item}</p>)}<h2># 最终交付物</h2>{selected.outputs.map((item) => <p key={item}>- {item}</p>)}<h2># 经验教训</h2><blockquote>{selected.lessons}</blockquote></section></article></div>
}

function TemplateLibrary() {
  const [selectedId, setSelectedId] = useState(templates[0].id)
  const selected = templates.find((item) => item.id === selectedId) ?? templates[0]
  return <div className="role-template-layout"><section><header><span>STANDARD TEMPLATES</span><h2>标准作业模板</h2><p>按业务过程装配的只读岗位模板。</p></header><div>{templates.map((item) => <button className={selected.id === item.id ? 'active' : ''} type="button" key={item.id} onClick={() => setSelectedId(item.id)}><ClipboardCheck size={18} /><span><strong>{item.title}</strong><small>{item.type} · {item.process}</small></span><em>{item.updated}</em></button>)}</div></section><article className="role-template-preview"><header><small>{selected.type}模板</small><h1>{selected.title}</h1><p>适用过程：{selected.process}</p></header>{selected.sections.map((item, index) => <section key={item}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item}</strong><p>请在此处填写相关内容；正式使用时按照当前项目情况补充，并保留必要依据。</p></div></section>)}<footer><LockKeyhole size={14} />公共模板只读，可在实际任务中基于副本使用</footer></article></div>
}

function RulesList() {
  return <section className="role-rules-list"><header><span>ROLE GUARDRAILS</span><h2>岗位规则与工作边界</h2><p>规则由组织维护，个人补充不能覆盖。</p></header><div>{roleRules.map((rule, index) => <article key={rule.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{rule.title}</h3><p>{rule.detail}</p><small>适用范围：{rule.scope}</small></div><em><ShieldCheck size={14} />强制</em></article>)}</div></section>
}

export function AssetContent({ assetId }: { assetId: RoleAssetId }) {
  if (assetId === 'description') return <RoleDescriptionDocument />
  if (assetId === 'capability') return <CapabilityModel />
  if (assetId === 'knowledge') return <KnowledgeTable />
  if (assetId === 'cases') return <CaseLibrary />
  if (assetId === 'templates') return <TemplateLibrary />
  return <RulesList />
}

export function PublicRoleAssetViewer({ assetId, onClose }: { assetId: RoleAssetId; onClose: () => void }) {
  const asset = roleAssetCatalog.find((item) => item.id === assetId) ?? roleAssetCatalog[0]
  return <div className="role-asset-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="role-asset-workspace" role="dialog" aria-modal="true" aria-label={asset.label}><header><div><span className="role-asset-workspace-icon"><asset.icon size={20} /></span><div><small>解决方案经理岗位集 · 个人只读</small><h2>{asset.label}</h2></div></div><div><em><LockKeyhole size={13} />组织维护</em><button type="button" aria-label="关闭" onClick={onClose}><X size={18} /></button></div></header><main><AssetContent assetId={assetId} /></main></section></div>
}

export function AdminCaseWorkbench({ onNotice }: { onNotice: (message: string) => void }) {
  const [mode, setMode] = useState<'existing' | 'dialogue' | 'upload'>('existing')
  const [prompt, setPrompt] = useState('这是一个航空制造知识库项目，周期大约十二周，最重要的是权限和答案来源可追溯。')
  const [extracted, setExtracted] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  return <div className="admin-case-workbench"><nav><button className={mode === 'existing' ? 'active' : ''} type="button" onClick={() => setMode('existing')}><FileStack size={15} />已有案例</button><button className={mode === 'dialogue' ? 'active' : ''} type="button" onClick={() => setMode('dialogue')}><MessageSquareText size={15} />对话抽取</button><button className={mode === 'upload' ? 'active' : ''} type="button" onClick={() => setMode('upload')}><Upload size={15} />上传 Markdown</button></nav>{mode === 'existing' && <CaseLibrary />}{mode === 'dialogue' && <div className="admin-case-dialogue"><section><header><Sparkles size={17} /><div><strong>案例抽取助手</strong><small>通过对话补齐项目上下文</small></div></header><div className="admin-case-messages"><article><Sparkles size={14} /><p>请描述项目背景、目标和最关键的约束。我会整理为岗位案例草稿。</p></article>{extracted && <article className="is-user"><p>{prompt}</p></article>}{extracted && <article><Sparkles size={14} /><p>已提取项目背景、周期、两个关键约束和三项候选交付物。右侧草稿中有两处需要确认。</p></article>}</div><footer><textarea aria-label="补充项目情况" value={prompt} onChange={(event) => setPrompt(event.target.value)} /><button type="button" onClick={() => setExtracted(true)}><Send size={16} />发送并抽取</button></footer></section><aside className={extracted ? 'is-ready' : ''}><header><div><small>STRUCTURED DRAFT</small><h2>案例结构化草稿</h2></div><em>{extracted ? '待确认' : '等待抽取'}</em></header>{extracted ? <div><label><span>案例名称</span><input defaultValue="航空制造知识库建设方案" /></label><div className="admin-case-draft-grid"><label><span>项目类型</span><input defaultValue="知识工程" /></label><label><span>项目周期</span><input defaultValue="12 周" /></label></div><label><span>项目背景</span><textarea defaultValue="制度、工艺文件和历史问题分散，业务人员难以快速找到可信答案。" /></label><label><span>关键约束</span><textarea defaultValue={'材料格式不统一\n敏感资料不可跨权限检索\n试点周期有限'} /></label><div className="admin-case-draft-warning">有 2 项信息需要管理员补充：最终验收结果、可复用模板。</div><button type="button" onClick={() => onNotice('案例草稿已确认并保存到公共岗位集。')}><Check size={15} />确认保存案例</button></div> : <div className="admin-case-empty"><Sparkles size={26} /><p>与左侧助手对话后，这里会实时形成可编辑的案例草稿。</p></div>}</aside></div>}{mode === 'upload' && <div className="admin-case-upload"><section><Upload size={30} /><h2>上传项目案例 Markdown</h2><p>Demo 将模拟解析标题、项目背景、关键约束、决策、交付物和经验教训。</p><button type="button" onClick={() => setUploaded(true)}>{uploaded ? '重新选择文件' : '选择 Markdown 文件'}</button></section>{uploaded && <aside><header><FileText size={20} /><div><strong>航空制造知识库建设方案.md</strong><small>18.6 KB · 已完成结构识别</small></div><em><CheckCircle2 size={14} />解析成功</em></header><div><span>项目背景<strong>1 段</strong></span><span>关键约束<strong>3 项</strong></span><span>关键决策<strong>3 项</strong></span><span>交付物<strong>4 项</strong></span><span>经验教训<strong>1 段</strong></span></div><p>检测到 1 项可能包含客户名称的信息，保存前请确认已经脱敏。</p><button type="button" onClick={() => onNotice('Markdown 案例已确认并保存到公共岗位集。')}><Check size={15} />确认并保存</button></aside>}</div>}</div>
}

export function AdminRoleDescription({ onNotice }: { onNotice: (message: string) => void }) {
  const [source, setSource] = useState<'upload' | 'knowledge' | null>(null)
  const chooseSource = (nextSource: 'upload' | 'knowledge') => {
    setSource(nextSource)
    onNotice(nextSource === 'upload' ? '已模拟上传“解决方案经理岗位说明书.pdf”。' : '已从企业知识库获取岗位说明书。')
  }
  return <div className="admin-description-source"><section><header><div><span>岗位说明书来源</span><h2>选择一种方式获取岗位说明书</h2><p>以下操作均为 Demo 模拟，点击后直接生成岗位说明书。</p></div>{source && <em><CheckCircle2 size={13} />获取完成</em>}</header><div><button className={source === 'upload' ? 'active' : ''} type="button" onClick={() => chooseSource('upload')}><Upload size={22} /><span><strong>手动上传</strong><small>模拟选择并上传本地岗位说明书</small></span><ChevronRight size={15} /></button><button className={source === 'knowledge' ? 'active' : ''} type="button" onClick={() => chooseSource('knowledge')}><BookOpen size={22} /><span><strong>知识库获取</strong><small>从企业知识库模拟获取已有岗位文件</small></span><ChevronRight size={15} /></button></div></section>{source ? <><div className="admin-description-file"><FileText size={20} /><div><strong>解决方案经理岗位说明书.pdf</strong><small>{source === 'upload' ? '来源：手动上传' : '来源：企业知识库'} · 326 KB · 获取完成</small></div><em><CheckCircle2 size={14} />已使用</em></div><RoleDescriptionDocument /></> : <div className="admin-description-empty"><FileText size={32} /><h3>尚未获取岗位说明书</h3><p>选择“手动上传”或“知识库获取”后，这里将展示完整岗位说明书。</p></div>}</div>
}

export function KnowledgeEditorModal({ item, onClose, onSave }: { item: KnowledgeItem | null; onClose: () => void; onSave: (item: KnowledgeItem) => void }) {
  const [fileName, setFileName] = useState(item?.name ?? '')
  const [type, setType] = useState(item?.type ?? '制度')
  const [scene, setScene] = useState(item?.scene ?? '')
  const types = ['制度', '规范', '方法', '检查单', '业务知识']
  return <div className="role-asset-submodal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="knowledge-editor-modal" role="dialog" aria-modal="true" aria-label={item ? '编辑知识' : '新增知识'}><header><div><span>KNOWLEDGE ITEM</span><h2>{item ? '编辑知识' : '新增知识'}</h2><p>上传一份知识文件，并补充类型和适用场景。</p></div><button type="button" aria-label="关闭" onClick={onClose}><X size={17} /></button></header><div><label><span>上传文件</span><button className="knowledge-file-picker" type="button" onClick={() => setFileName('客户需求澄清指导手册.pdf')}><Upload size={18} /><span><strong>{fileName || '点击选择文件'}</strong><small>{fileName ? '文件已选择 · 点击可重新选择' : '支持 PDF、Word、Excel、Markdown'}</small></span></button></label><fieldset><legend>类型（单选）</legend><div>{types.map((option) => <label className={type === option ? 'active' : ''} key={option}><input type="radio" name="knowledge-type" value={option} checked={type === option} onChange={() => setType(option)} />{option}</label>)}</div></fieldset><label><span>适用场景</span><input placeholder="例如：需求澄清、方案评审" value={scene} onChange={(event) => setScene(event.target.value)} /></label></div><footer><button type="button" onClick={onClose}>取消</button><button className="is-primary" type="button" disabled={!fileName || !scene} onClick={() => onSave({ id: item?.id ?? `knowledge-${Date.now()}`, name: fileName, type, scene, summary: item?.summary ?? `从“${fileName}”提取的岗位知识内容。` })}><Check size={15} />{item ? '保存修改' : '确认新增'}</button></footer></section></div>
}

export function AdminKnowledgeWorkbench({ onNotice }: { onNotice: (message: string) => void }) {
  const [items, setItems] = useState<KnowledgeItem[]>(initialKnowledgeItems)
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null | undefined>(undefined)
  const saveItem = (nextItem: KnowledgeItem) => {
    setItems((current) => current.some((item) => item.id === nextItem.id) ? current.map((item) => item.id === nextItem.id ? nextItem : item) : [nextItem, ...current])
    setEditingItem(undefined)
    onNotice(editingItem ? '知识内容已更新。' : '新的知识文件已加入知识地图。')
  }
  const deleteItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
    onNotice('知识内容已删除。')
  }
  return <div className="admin-generic-asset"><div className="admin-asset-toolbar"><span>{items.length} 项岗位知识 · 按文件维护</span><button type="button" onClick={() => setEditingItem(null)}>新增知识</button></div><KnowledgeTable items={items} editable onEdit={setEditingItem} onDelete={deleteItem} />{editingItem !== undefined && <KnowledgeEditorModal item={editingItem} onClose={() => setEditingItem(undefined)} onSave={saveItem} />}</div>
}

const markdownAssetContent: Record<RoleAssetId, { description: string; content: string }> = {
  description: {
    description: '上传岗位说明书后，系统自动整理为可编辑的结构化 Markdown。',
    content: '# 岗位目标\n- 连接客户业务问题与公司产品能力，形成可评审、可交付的解决方案。\n\n# 核心职责\n- 组织客户需求澄清，明确目标、范围、约束和验收口径。\n- 完成业务架构、能力组合、实施路径与风险设计。\n- 组织方案评审，并向项目团队移交关键上下文。\n\n# 权限边界\n- 可读取已授权的客户与项目资料。\n- 不可替代项目负责人批准范围、预算或对外承诺。',
  },
  capability: {
    description: '可从 C 大脑抽取岗位过程，也可以直接手动维护。',
    content: '# 需求传递\n- 接收客户线索，判断是否进入正式澄清。\n\n# 需求澄清\n- 明确客户目标、范围、验收口径与不可妥协边界。\n\n# 方案设计\n- 形成业务架构、能力组合、工作量与风险设计。\n\n# 方案评审\n- 组织评审、闭环意见并确认可交付性。\n\n# 方案交付\n- 向交付团队移交方案上下文，并支持关键节点。',
  },
  knowledge: {
    description: '将岗位相关制度、方法和知识范围沉淀为结构化条目。',
    content: '# 必备制度\n- 交付项目管理办法：适用于项目启动、交付与验收。\n- 项目数据安全管理规定：约束材料读取、引用与对外发送。\n\n# 常用方法\n- 客户需求澄清方法：从目标、范围、角色、约束和验收口径展开。\n- 方案评审检查单：覆盖完整性、依据、风险与权限边界。\n\n# 业务知识\n- 航空制造业务术语与常用业务口径。',
  },
  cases: {
    description: '用结构化 Markdown 记录可复用的任务案例与经验。',
    content: '# 航空制造知识库建设方案\n- 背景：制度、工艺文件和历史问题分散，难以快速获得可信答案。\n- 目标：建设带权限控制和来源追溯的岗位知识库。\n- 关键约束：敏感资料不可跨权限检索；试点周期为 12 周。\n- 经验：先用高频任务验证知识质量和权限链路，再扩大范围。\n\n# 企业智能助理解决方案交付\n- 目标：完成统一入口、三个高频场景和受控动作确认机制。\n- 经验：能力描述需落到具体业务任务和协作步骤。',
  },
  templates: {
    description: '用 Markdown 维护岗位 KPI 的目标、口径和达成标准。',
    content: '# 方案交付率\n- 目标：不低于 90%。\n- 口径：按期完成并通过验收的方案数量 / 计划交付方案数量。\n- 达成标准：每月复盘未按期交付原因和改进动作。\n\n# 客户满意度\n- 目标：不低于 4.5 分。\n- 口径：项目阶段性满意度调研平均分。\n\n# 评审通过率\n- 目标：不低于 95%。\n- 口径：一次评审通过的方案数量 / 参加评审的方案数量。',
  },
  rules: {
    description: '以简洁、可编辑的 Markdown 明确岗位工作边界。',
    content: '# 正式动作必须确认\n- 派任务、催办、修改业务数据和对外发送材料前，必须获得用户明确确认。\n\n# 事实必须可追溯\n- 引用制度、项目数据和业务结论时展示来源；依据不足时明确说明。\n\n# 敏感材料不得扩散\n- 个人材料和受限项目内容只能在授权范围内使用，不得进入公共岗位资产。\n\n# 岗位职责不可由个人覆盖\n- 个人补充可以增加经验和方法，但不能删除组织定义的正式职责。',
  },
}

export function MarkdownAssetEditor({ assetId, onNotice }: { assetId: RoleAssetId; onNotice: (message: string) => void }) {
  const asset = roleAssetCatalog.find((item) => item.id === assetId) ?? roleAssetCatalog[0]
  const [content, setContent] = useState(markdownAssetContent[assetId].content)
  const [editing, setEditing] = useState(false)
  const uploadDescription = () => {
    setContent(markdownAssetContent.description.content)
    setEditing(false)
    onNotice('已上传“解决方案经理岗位说明书.pdf”，并自动抽取为结构化 Markdown。')
  }
  const extractCapability = () => {
    setContent(markdownAssetContent.capability.content)
    setEditing(false)
    onNotice('已从 C 大脑抽取岗位能力过程，可继续手动修改。')
  }
  const save = () => {
    setEditing(false)
    onNotice(`“${asset.label}”已保存，待同步到使用该岗位的人员。`)
  }
  return <section className="admin-markdown-asset">
    <header><div><h2>{asset.label}</h2><p>{markdownAssetContent[assetId].description}</p></div><div className="admin-markdown-asset-actions">
      {assetId === 'description' && <button type="button" onClick={uploadDescription}><Upload size={15} />上传文件</button>}
      {assetId === 'capability' && <button type="button" onClick={extractCapability}><GitBranch size={15} />从 C 大脑抽取</button>}
      {editing ? <button className="is-primary" type="button" onClick={save}><Check size={15} />保存</button> : <button type="button" onClick={() => setEditing(true)}><PenLine size={15} />编辑</button>}
    </div></header>
    {assetId === 'description' && <div className="admin-markdown-asset-source"><FileText size={16} /><span><strong>解决方案经理岗位说明书.pdf</strong><small>已上传 · 已完成结构化抽取</small></span></div>}
    {editing ? <textarea aria-label={`编辑${asset.label} Markdown`} value={content} onChange={(event) => setContent(event.target.value)} /> : <pre>{content}</pre>}
  </section>
}

function AdminGenericAssetEditor({ assetId, onNotice }: { assetId: RoleAssetId; onNotice: (message: string) => void }) {
  return <MarkdownAssetEditor assetId={assetId} onNotice={onNotice} />
}

export function AdminRoleAssetEditor({ assetId, onClose, onNotice }: { assetId: RoleAssetId; onClose: () => void; onNotice: (message: string) => void }) {
  const asset = roleAssetCatalog.find((item) => item.id === assetId) ?? roleAssetCatalog[0]
  return <div className="role-asset-backdrop is-admin" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="role-asset-workspace" role="dialog" aria-modal="true" aria-label={`配置${asset.label}`}><header><div><span className="role-asset-workspace-icon"><asset.icon size={20} /></span><div><small>解决方案经理岗位集 · 后台配置</small><h2>{asset.label}</h2></div></div><div><button type="button" aria-label="关闭" onClick={onClose}><X size={18} /></button></div></header><main><AdminGenericAssetEditor assetId={assetId} onNotice={onNotice} /></main></section></div>
}
