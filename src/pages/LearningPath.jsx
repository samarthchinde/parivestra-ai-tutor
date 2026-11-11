import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Circle, Compass, GraduationCap, Route } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader, ProgressBar } from "../components/UI";
import { classSubjects } from "../data/curriculum";
export default function LearningPath(){
 const [grade,setGrade]=useState(()=>localStorage.getItem("parivestra_grade")||"Class 6");
 const [subject,setSubject]=useState("Mathematics");
 const [done,setDone]=useState(()=>JSON.parse(localStorage.getItem("parivestra_path_done")||"{}"));
 const topics=useMemo(()=>classSubjects(grade),[grade]); const chosen=topics[subject]||Object.values(topics)[0]||[]; const key=`${grade}-${subject}`; const completed=done[key]||[]; const toggle=(i)=>{const next=completed.includes(i)?completed.filter(x=>x!==i):[...completed,i];const all={...done,[key]:next};setDone(all);localStorage.setItem("parivestra_path_done",JSON.stringify(all));};
 return <><PageHeader eyebrow="YOUR STEP-BY-STEP ROADMAP" title="Your learning path" description="Build confidence one topic at a time. Mark lessons complete as you learn."/><div className="learning-toolbar"><label className="grade-picker"><GraduationCap size={16}/> CLASS <select value={grade} onChange={e=>{setGrade(e.target.value);localStorage.setItem("parivestra_grade",e.target.value);setSubject("Mathematics")}}>{Array.from({length:10},(_,i)=><option key={i}>Class {i+1}</option>)}</select></label><select className="subject-select" value={subject} onChange={e=>setSubject(e.target.value)}>{Object.keys(topics).map(s=><option key={s}>{s}</option>)}</select></div>
 <section className="path-summary"><div className="path-summary-icon"><Compass size={25}/></div><div className="path-summary-copy"><span>YOUR {grade.toUpperCase()} ROADMAP</span><h2>{subject} explorer</h2><p>{completed.length} of {chosen.length} learning steps completed</p><ProgressBar value={chosen.length?completed.length/chosen.length*100:0}/></div><strong>{chosen.length?Math.round(completed.length/chosen.length*100):0}%</strong></section>
 <div className="path-list">{chosen.map((topic,i)=><div className={`path-step ${completed.includes(i)?"is-done":""}`} key={topic}><button className="step-check" aria-label={completed.includes(i)?"Mark incomplete":"Mark complete"} onClick={()=>toggle(i)}>{completed.includes(i)?<CheckCircle2/>:<Circle/>}</button><div className="step-number">{String(i+1).padStart(2,"0")}</div><div className="step-copy"><span>STEP {i+1} · {i===0?"START HERE":i===chosen.length-1?"WRAP UP":"KEEP GOING"}</span><h3>{topic}</h3><p>{i===0?"Begin with the basics and build a strong foundation.":"Study the concept, try examples, then practise what you learned."}</p></div><Link to="/tutor" className="step-action">Learn <ArrowRight size={15}/></Link></div>)}</div>
 </>;
}
