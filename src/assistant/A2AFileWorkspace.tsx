import { useEffect, useState } from 'react'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import { Markdown } from '../role-center/ui'
import { fileSize, type A2AAttachment } from './a2aConversationTypes'
import './a2a-files.css'

export type ConversationFile = A2AAttachment & { sender: string; sentAt: string }
export default function A2AFileWorkspace({ files, request, scope = 'conversation' }: {
  scope?: 'task' | 'conversation'; files: ConversationFile[]; request?: { id: string; serial: number }
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [listing, setListing] = useState(true)
  const [downloadError, setDownloadError] = useState('')
  const selected = files.find(file => file.id === selectedId)
  const open = (id: string) => {
    setSelectedId(id)
    setListing(false)
    setDownloadError('')
  }
  useEffect(() => {
    if (request?.id) open(request.id)
  }, [request?.id, request?.serial])

  const download = () => {
    if (!selected) return
    try {
      const url = URL.createObjectURL(new Blob([selected.content], { type: selected.kind === 'html' ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url; link.download = selected.name
      document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setDownloadError('')
    } catch { setDownloadError('无法下载文件，请重试。') }
  }

  return <section className="a2a-files" aria-label={scope === 'task' ? '任务文件' : '会话文件'}>
    <div className="a2a-files-list" style={{ display: listing ? undefined : 'none' }}>
      {files.length ? files.map(file => <button className="a2a-file-row" key={file.id} onClick={() => open(file.id)}>
        <FileText size={22}/><span><strong>{file.name}</strong><small>{file.sender} · {file.sentAt}</small><small>{file.kind === 'html' ? 'HTML' : 'Markdown'} · {fileSize(file.content)}</small></span>
      </button>) : <div className="a2a-files-empty"><FileText size={32}/><strong>{scope === 'task' ? '当前任务暂无文件' : '当前会话暂无文件'}</strong><p>{scope === 'task' ? '你添加的材料、整理的输出物和有权查看的协作附件会显示在这里。' : '在会话中发送的文件会显示在这里。'}</p></div>}
    </div>
    <section className="a2a-file-preview" aria-label="文件预览" style={{ display: listing ? 'none' : 'flex' }}>
      <header className="a2a-file-preview-header">
        <button className="a2a-file-back" type="button" onClick={() => setListing(true)}><ArrowLeft size={16}/>返回文件列表</button>
        <strong title={selected?.name}>{selected?.name ?? '文件不可用'}</strong>
        {selected && <button className="a2a-file-download" type="button" aria-label="下载文件" title="下载文件" onClick={download}><Download size={18}/></button>}
      </header>
      {downloadError && <p role="alert" className="a2a-file-error">{downloadError}</p>}
      <div key={selectedId} className="a2a-file-preview-body">
        {!selected ? <p className="a2a-file-error">当前文件不可用，请返回文件列表。</p>
          : selected.kind === 'html'
            ? <iframe className="a2a-file-html" title={selected.name} sandbox="" srcDoc={selected.content}/>
            : <article className="a2a-file-document"><Markdown content={selected.content}/></article>}
      </div>
    </section>
  </section>
}
