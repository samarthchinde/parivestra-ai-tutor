import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, GraduationCap } from "lucide-react";
import { PageHeader } from "../components/UI";
import { classSubjects } from "../data/curriculum";
export default function Subjects() {
  const [grade, setGrade] = useState(() => localStorage.getItem("parivestra_grade") || "Class 6");
  const [open, setOpen] = useState("Mathematics");
  const subjects = useMemo(() => classSubjects(grade), [grade]);
  return <><PageHeader eyebrow="CLASS-WISE SYLLABUS" title="Explore your syllabus" description="Choose your class to see subjects, chapters and key topics. Content is a broad learning guide; follow your school's prescribed textbook for the official syllabus."/>
    <div className="learning-toolbar"><label className="grade-picker"><GraduationCap size={16}/> YOUR CLASS <select value={grade} onChange={e=>{setGrade(e.target.value);localStorage.setItem("parivestra_grade",e.target.value)}}>{Array.from({length:10},(_,i)=><option key={i}>Class {i+1}</option>)}</select></label><span className="muted-note">{Object.keys(subjects).length} subjects · {Object.values(subjects).flat().length} topics</span></div>
    <div className="syllabus-grid">{Object.entries(subjects).map(([name,topics],i)=><section className={`syllabus-card accent-${i%4}`} key={name}><button className="syllabus-toggle" onClick={()=>setOpen(open===name?"":name)}><span className="syllabus-icon"><BookOpen size={20}/></span><span className="syllabus-title"><strong>{name}</strong><small>{topics.length} chapters / topic groups</small></span>{open===name?<ChevronDown/>:<ChevronRight/>}</button>{open===name&&<ol className="topic-list">{topics.map((topic,index)=><li key={topic}><span>{String(index+1).padStart(2,"0")}</span>{topic}</li>)}</ol>}</section>)}</div>
  </>;
}
