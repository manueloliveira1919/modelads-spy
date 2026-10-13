import { DEFAULT_QUIZ_SETTINGS, type QuizSettings } from "./quiz-types";
export const QUIZ_THEMES = [
 {name:"Neon Escuro",bg:"#090B14",end:"#141A2E",primary:"#6D7CFF",secondary:"#1DB8FF",text:"#F5F7FF",buttonText:"#FFFFFF"},
 {name:"Claro Clean",bg:"#F7FAFC",end:"#E8F0F9",primary:"#2456C7",secondary:"#087C9C",text:"#182338",buttonText:"#FFFFFF"},
 {name:"Roxo Premium",bg:"#160E25",end:"#2B1744",primary:"#A879FF",secondary:"#E37ACB",text:"#FAF5FF",buttonText:"#160E25"},
 {name:"Verde Saúde",bg:"#F1FAF5",end:"#DFF3E8",primary:"#187B50",secondary:"#146B71",text:"#15392B",buttonText:"#FFFFFF"},
 {name:"Laranja Energia",bg:"#17100C",end:"#322015",primary:"#FFA348",secondary:"#FFC85A",text:"#FFF8EE",buttonText:"#271A0C"},
 {name:"Rosa Beauty",bg:"#FFF5F9",end:"#FCE2ED",primary:"#AE2468",secondary:"#853EA2",text:"#422037",buttonText:"#FFFFFF"},
];
export function applyQuizTheme(index:number,s:QuizSettings):QuizSettings {
 const t=QUIZ_THEMES[index]??QUIZ_THEMES[0];
 return {...s,background:{...s.background,type:"gradient",color:t.bg,gradientFrom:t.bg,gradientTo:t.end},colors:{primary:t.primary,secondary:t.secondary,text:t.text,button:t.primary,buttonText:t.buttonText},button:{...s.button,radius:20,height:56},progress:{...s.progress,thickness:5,style:"gradient"}};
}
export function readableQuizText(background:string):string {
 const hex=background.replace("#","");if(!/^[0-9a-f]{6}$/i.test(hex))return DEFAULT_QUIZ_SETTINGS.colors.text;
 const rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.35?"#182338":"#F5F7FF";
}
