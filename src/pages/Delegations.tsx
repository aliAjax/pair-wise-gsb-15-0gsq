import {useMemo,useState} from 'react';
import {AlertTriangle,ArrowRight,Link2,RotateCcw,ShieldAlert,UserCog,X} from 'lucide-react';
import {PageTitle} from '../components/common';
import {currentUser,domains,users} from '../../mock-data/catalog';
import {useAppStore} from '../store/useAppStore';
import {defaultRange,delegationStatus,fmtDT,fmtRange,type DelegationConflict} from '../store/delegation';
import type {Delegation} from '../types';

const ruleLabel:Record<string,string>={OVERLAP:'时段重叠',CYCLE:'循环委托链',INVALID:'校验未通过'};

export function Delegations(){
 const delegations=useAppStore(s=>s.delegations);
 const register=useAppStore(s=>s.registerDelegation);
 const revoke=useAppStore(s=>s.revokeDelegation);
 const reset=useAppStore(s=>s.resetDelegationData);
 const range=useMemo(()=>defaultRange(),[]);
 const [form,setForm]=useState({delegator:currentUser,delegate:'',domain:domains[0],start:range.start,end:range.end,reason:''});
 const [report,setReport]=useState<ReturnType<typeof register>|null>(null);
 const [domainFilter,setDomainFilter]=useState('all');

 const submit=()=>{const r=register(form);setReport(r)};
 const rows=[...delegations].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).filter(d=>domainFilter==='all'||d.domain===domainFilter);
 const conflicts=report&&'conflicts'in report?report.conflicts:[];
 const errors=report&&'errors'in report?report.errors:[];

 return <div className="page delegation-page">
  <PageTitle eyebrow="审批中心" title="Delegation Desk" desc="按业务域登记审批委托；系统校验时段重叠与循环委托链，并把实际代办人同步到流程运行记录。"
   actions={<button className="secondary" onClick={reset} data-testid="reset-delegations"><RotateCcw/>恢复演示数据</button>}/>
  <div className="delegation-grid">
   <section className="panel delegation-form">
    <div className="panel-head"><div><h2><UserCog/>登记审批委托</h2><p>委托仅对所选业务域内、且尚未产生人工签字的审批生效</p></div></div>
    <div className="delegation-body">
     <div className="form-row">
      <label>委托人<select aria-label="委托人" value={form.delegator} onChange={e=>setForm({...form,delegator:e.target.value})}>{users.map(u=><option key={u}>{u}</option>)}</select></label>
      <label>受托人<select aria-label="受托人" value={form.delegate} onChange={e=>setForm({...form,delegate:e.target.value})}><option value="">请选择受托人</option>{users.filter(u=>u!==form.delegator).map(u=><option key={u}>{u}</option>)}</select></label>
     </div>
     <label>业务域<select aria-label="业务域" value={form.domain} onChange={e=>setForm({...form,domain:e.target.value})}>{domains.map(d=><option key={d}>{d}</option>)}</select></label>
     <div className="form-row">
      <label>开始时间<input aria-label="委托开始时间" type="datetime-local" value={form.start} onChange={e=>setForm({...form,start:e.target.value})}/></label>
      <label>结束时间<input aria-label="委托结束时间" type="datetime-local" value={form.end} onChange={e=>setForm({...form,end:e.target.value})}/></label>
     </div>
     <label>委托说明<textarea aria-label="委托说明" rows={3} value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="例如：外出培训期间的财务审批请代办"/></label>
     <button data-testid="submit-delegation" className="submit-delegation" onClick={submit}>提交登记</button>
     <small className="form-note">规则：① 同一业务域内委托时段不得与本人已登记委托重叠；② 受托人经转委托最终又指回本人时构成循环链，将被拦截。</small>
    </div>
   </section>

   <section className="panel delegation-list-panel">
    <div className="panel-head"><div><h2>我的委托关系</h2><p>刷新后与流程运行记录保持一致</p></div>
     <select aria-label="委托业务域筛选" value={domainFilter} onChange={e=>setDomainFilter(e.target.value)}><option value="all">全部业务域</option>{domains.map(d=><option key={d}>{d}</option>)}</select></div>
    <table className="delegation-table">
     <thead><tr><th>委托人</th><th>受托人</th><th>业务域</th><th>委托时段</th><th>状态</th><th></th></tr></thead>
     <tbody>{rows.map(d=>{const st=delegationStatus(d);return <tr key={d.id} data-testid="delegation-row" data-state={st}>
      <td><b>{d.delegator}</b></td><td><span className="arrow-cell">{d.delegate}</span></td><td>{d.domain}</td>
      <td><small>{fmtRange(d.start,d.end)}</small>{d.status==='revoked'&&<em className="revoked-note">撤销于 {d.revokedAt}</em>}</td>
      <td><span className={'dlg-status '+st}>{({active:'生效中',scheduled:'待生效',expired:'已结束',revoked:'已撤销'} as any)[st]}</span></td>
      <td>{d.status!=='revoked'&&<button className="secondary mini" data-testid="revoke-delegation" onClick={()=>{revoke(d.id);setReport(null)}}>撤销</button>}</td>
     </tr>})}</tbody>
    </table>
   </section>
  </div>

  {report&&(conflicts.length>0||errors.length>0)&&<section className="panel conflict-panel" data-testid="conflict-panel">
   <div className="conflict-head"><ShieldAlert/><h2>登记冲突，未保存</h2><span className="spacer"/><button className="icon-btn" aria-label="关闭冲突提示" onClick={()=>setReport(null)}><X/></button></div>
   {'input'in report&&<div className="conflict-submitted">
    <small>本次提交</small>
    <span>委托人 <b>{report.input.delegator}</b></span><span>受托人 <b>{report.input.delegate||'—'}</b></span><span>业务域 <b>{report.input.domain}</b></span>
    <span>时段 <b>{report.input.start?fmtRange(report.input.start,report.input.end):'—'}</b></span>
   </div>}
   {errors.map((m,k)=><div key={'e'+k} className="conflict-card invalid" data-testid="conflict-item">
    <span className="conflict-rule invalid"><AlertTriangle/>{ruleLabel.INVALID}</span><div className="conflict-body"><b>{m}</b></div></div>)}
   {conflicts.map((c:DelegationConflict,k)=><div key={'c'+k} className="conflict-card" data-testid="conflict-item" data-rule={c.rule}>
    <span className={'conflict-rule '+c.rule}><AlertTriangle/>{ruleLabel[c.rule]}</span>
    <div className="conflict-body">
     <b>{c.message}</b>
     <p>委托人：{c.delegator}　受托人：{c.delegate}　业务域：{form.domain}　时段：{fmtRange(c.start,c.end)}</p>
     {c.path&&<div className="cycle-chain" data-testid="cycle-chain"><Link2/>{chainText(c.path)}</div>}
    </div>
   </div>)}
  </section>}

  <section className="panel delegation-flow" data-testid="active-chains">
   <div className="panel-head"><div><h2>当前生效委托链</h2><p>流程预览与异常实例按此解析实际代办人</p></div></div>
   <div className="chain-board">{domains.map(dm=>{const act=delegations.filter(d=>d.domain===dm&&delegationStatus(d)==='active');
    return <div key={dm} className="chain-col" data-testid="chain-col"><small>{dm}</small>{act.length?act.map(d=><div key={d.id} className="chain-link"><b>{d.delegator}</b><ArrowRight/><span>{d.delegate}</span></div>):<p>暂无生效委托</p>}</div>})}</div>
  </section>
 </div>;
}
function chainText(path:Delegation[]){
 const people=path.map((d,i)=>i===0?[d.delegator,d.delegate]:[d.delegate]).flat();
 return people.map((p,i)=>i===0?<span key={p+i} className="chain-person">{p}</span>:<span key={p+i} className="chain-seg"><ArrowRight/><b className="chain-person">{p}</b></span>);
}
