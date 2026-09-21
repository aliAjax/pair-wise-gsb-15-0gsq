import {useMemo,useState} from 'react';
import {Ban,CalendarClock,Info,ShieldAlert,UserCog,UserRoundCheck,Undo2} from 'lucide-react';
import {Empty,PageTitle,Status} from '../components/common';
import {useAppStore} from '../store/useAppStore';
import {chainPath} from '../store/delegation';
import {domains,users} from '../../mock-data/catalog';
import {NOW} from '../../mock-data/delegations';
import type {Delegation,DelegationConflict} from '../types';

const period=(d:{startAt:string;endAt:string})=>`${d.startAt.replace('T',' ')} ~ ${d.endAt.replace('T',' ')}`;
const ruleClass:Record<string,string>={'时段重叠':'rule-overlap','循环委托链':'rule-cycle','禁止委托本人':'rule-self'};

export function Delegations(){
 const delegations=useAppStore(s=>s.delegations),signatures=useAppStore(s=>s.signatures),register=useAppStore(s=>s.registerDelegation),revoke=useAppStore(s=>s.revokeDelegation);
 const [delegator,setDelegator]=useState('林秋'),[delegatee,setDelegatee]=useState('陈默'),[domain,setDomain]=useState('财务');
 const [startAt,setStartAt]=useState(NOW),[endAt,setEndAt]=useState('2026-10-10T18:00'),[reason,setReason]=useState('');
 const [conflicts,setConflicts]=useState<DelegationConflict[]>([]),[tab,setTab]=useState<'all'|'active'|'revoked'>('active'),[domainFilter,setDomainFilter]=useState('all');
 const rows=useMemo(()=>delegations.filter(d=>(tab==='all'||d.status===tab)&&(domainFilter==='all'||d.domain===domainFilter)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),[delegations,tab,domainFilter]);
 const submit=()=>{const res=register({delegator,delegatee,domain,startAt,endAt,reason});setConflicts(res.conflicts);if(res.ok){setConflicts([]);setReason('')}};
 const activeCount=delegations.filter(d=>d.status==='active').length;
 return <div className="page delegation-page">
  <PageTitle eyebrow="流程管理 / 授权" title="审批委托台" desc="按业务域登记审批委托。系统校验时段重叠与循环委托链，生效后的实际代办人会同步到表单预览与实例详情。" actions={<span className="now-chip"><CalendarClock/>演示当前时间：{NOW.replace('T',' ')}</span>}/>
  <div className="delegation-layout">
   <section className="panel delegation-form" data-testid="delegation-form">
    <div className="panel-head"><div><h2><UserCog/>登记新的委托</h2><p>同一员工在同一业务域内，生效时段不可重叠</p></div></div>
    <div className="form-grid">
     <label>委托人<select aria-label="委托人" value={delegator} onChange={e=>setDelegator(e.target.value)}>{users.map(u=><option key={u}>{u}</option>)}</select></label>
     <label>受托人<select aria-label="受托人" value={delegatee} onChange={e=>setDelegatee(e.target.value)}>{users.map(u=><option key={u}>{u}</option>)}</select></label>
     <label>业务域<select aria-label="委托业务域" value={domain} onChange={e=>setDomain(e.target.value)}>{domains.map(x=><option key={x}>{x}</option>)}</select></label>
     <label>委托事由<input aria-label="委托事由" value={reason} onChange={e=>setReason(e.target.value)} placeholder="例如：外出驻场 / 休假"/></label>
     <label>开始时间<input aria-label="委托开始时间" type="datetime-local" value={startAt} onChange={e=>setStartAt(e.target.value)}/></label>
     <label>结束时间<input aria-label="委托结束时间" type="datetime-local" value={endAt} onChange={e=>setEndAt(e.target.value)}/></label>
    </div>
    <div className="form-submit"><button data-testid="submit-delegation" onClick={submit}><UserRoundCheck/>提交登记</button><small>提交时将校验：禁止委托本人 · 时段不重叠 · 不形成循环委托链</small></div>
    {conflicts.length>0&&<div className="conflict-panel" data-testid="conflict-panel">
     <div className="conflict-head"><ShieldAlert/><b>提交冲突：命中 {conflicts.length} 条规则，委托未登记</b></div>
     {conflicts.map((c,i)=><div className="conflict-card" data-testid="conflict-item" data-rule={c.rule} key={i}>
      <div className="conflict-title"><span className={'rule-badge '+ruleClass[c.rule]}>{c.rule}</span><b>{c.message}</b></div>
      {c.delegation&&<ConflictTable rows={[c.delegation]}/>}
      {c.chain&&<><div className="cycle-path" data-testid="cycle-path">闭环路径：<b>{chainPath(c.chain)}</b></div><ConflictTable rows={c.chain.filter(d=>d.id!=='(待登记)')} highlightAll/></>}
     </div>)}
    </div>}
   </section>
   <aside className="panel delegation-rules">
    <h3><Info/>校验规则说明</h3>
    <ol>
     <li><b>禁止委托本人</b><span>委托人不能同时是受托人</span></li>
     <li><b>时段重叠</b><span>同一委托人在同一业务域内，任意时段只能有一条生效委托</span></li>
     <li><b>循环委托链</b><span>A→B→…→A 会让任务无人承接，提交时列出整条闭环</span></li>
    </ol>
    <p>撤销只影响后续流转；已经产生的人工审批签字保留原处理人。</p>
   </aside>
  </div>
  <section className="panel delegation-list">
   <div className="panel-head"><div><h2>委托记录</h2><p>当前生效委托 {activeCount} 条</p></div>
    <div className="delegation-filters">
     {[['active','生效中'],['revoked','已撤销'],['all','全部']].map(([v,l])=><button key={v} className={'filter '+(tab===v?'active':'')} onClick={()=>setTab(v as any)}>{l}</button>)}
     <select aria-label="委托记录业务域筛选" value={domainFilter} onChange={e=>setDomainFilter(e.target.value)}><option value="all">全部业务域</option>{domains.map(x=><option key={x}>{x}</option>)}</select>
    </div>
   </div>
   {rows.length?<table data-testid="delegation-table"><thead><tr><th>委托人</th><th>受托人</th><th>业务域</th><th>委托时段</th><th>状态</th><th>登记时间</th><th>事由</th><th></th></tr></thead>
    <tbody>{rows.map(d=><tr key={d.id} data-testid="delegation-row"><td><b>{d.delegator}</b></td><td>{d.delegatee}</td><td>{d.domain}</td><td className="period-cell">{period(d)}</td><td><Status value={d.status==='active'?'running':'archived'}/>{d.status==='revoked'&&d.revokedAt&&<small className="revoked-at">撤销于 {d.revokedAt}</small>}</td><td>{d.createdAt}</td><td>{d.reason||'—'}</td><td>{d.status==='active'?<button className="secondary mini" data-testid="revoke-delegation" onClick={()=>revoke(d.id)}><Undo2/>撤销</button>:<span className="muted"><Ban/>已停止流转</span>}</td></tr>)}</tbody></table>:<Empty title="没有匹配的委托记录"/>}
  </section>
  <section className="panel signature-log">
   <div className="panel-head"><div><h2>人工审批签字记录</h2><p>签字时的实际处理人作为事实快照，撤销委托不会改写历史签字</p></div></div>
   {signatures.length?<table data-testid="signature-table"><thead><tr><th>流程实例</th><th>审批节点</th><th>名义审批人</th><th>实际签字人</th><th>签字时间</th><th>来源委托</th></tr></thead>
    <tbody>{signatures.map(s=>{const linked=s.delegationIds.map(id=>delegations.find(d=>d.id===id)).filter(Boolean) as Delegation[];return <tr key={s.id} data-testid="signature-row"><td><b>{s.instanceId}</b></td><td>{s.nodeLabel}</td><td>{s.nominalApprover}</td><td className="signer-cell">{s.signer}{s.signer!==s.nominalApprover&&<em className="delegate-tag">代签</em>}</td><td>{s.signedAt}</td><td>{linked.length?linked.map(d=><span key={d.id} className="linked-delegation"><i>{d.delegator} → {d.delegatee} · {d.domain}</i>{d.status==='revoked'?<em className="kept-badge">委托已撤销，签字保留</em>:<em className="active-badge">生效委托</em>}</span>):<span className="muted">本人审批，无委托</span>}</td></tr>})}</tbody></table>:<Empty title="暂无签字记录"/>}
  </section>
 </div>;
}

function ConflictTable({rows,highlightAll}:{rows:Delegation[];highlightAll?:boolean}){
 return <table className={'conflict-table '+(highlightAll?'chain':'')}><thead><tr><th>委托人</th><th>受托人</th><th>业务域</th><th>时段</th><th>命中规则</th></tr></thead>
  <tbody>{rows.map(d=><tr key={d.id}><td><b>{d.delegator}</b>{d.id==='(待登记)'&&<em className="new-tag">本次新委托</em>}</td><td>{d.delegatee}</td><td>{d.domain}</td><td className="period-cell">{period(d)}</td><td><span className={'rule-badge '+(highlightAll?ruleClass['循环委托链']:ruleClass['时段重叠'])}>{highlightAll?'环上委托':'时段重叠'}</span></td></tr>)}</tbody></table>;
}
