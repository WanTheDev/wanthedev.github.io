import{f as O,c as k,i as I,R as P,B as W,j as R,n as q,u as A,m as n,o as c,S as _,p as m,q as p}from"./index-2709bd81.js";import{G as x,S as B}from"./StarryArea-23f2f5ab.js";import"./Container-50b3b5b6.js";import"./Star-52e4c195.js";var G={root:"m-6d731127"};const g=G;var E=Object.defineProperty,$=Object.defineProperties,D=Object.getOwnPropertyDescriptors,i=Object.getOwnPropertySymbols,u=Object.prototype.hasOwnProperty,f=Object.prototype.propertyIsEnumerable,v=(a,e,s)=>e in a?E(a,e,{enumerable:!0,configurable:!0,writable:!0,value:s}):a[e]=s,d=(a,e)=>{for(var s in e||(e={}))u.call(e,s)&&v(a,s,e[s]);if(i)for(var s of i(e))f.call(e,s)&&v(a,s,e[s]);return a},H=(a,e)=>$(a,D(e)),V=(a,e)=>{var s={};for(var t in a)u.call(a,t)&&e.indexOf(t)<0&&(s[t]=a[t]);if(a!=null&&i)for(var t of i(a))e.indexOf(t)<0&&f.call(a,t)&&(s[t]=a[t]);return s};const F={gap:"md",align:"stretch",justify:"flex-start"},L=R((a,{gap:e,align:s,justify:t})=>({root:{"--stack-gap":q(e),"--stack-align":s,"--stack-justify":t}})),l=O((a,e)=>{const s=k("Stack",F,a),t=s,{classNames:h,className:j,style:S,styles:w,unstyled:y,vars:C,align:oe,justify:ie,gap:ce,variant:b}=t,N=V(t,["classNames","className","style","styles","unstyled","vars","align","justify","gap","variant"]),T=I({name:"Stack",props:s,classes:g,className:j,style:S,classNames:h,styles:w,unstyled:y,vars:C,varsResolver:L});return P.createElement(W,d(H(d({ref:e},T("root")),{variant:b}),N))});l.classes=g;l.displayName="@mantine/core/Stack";const M="_bannerContainer_d6vvu_1",Q="_topSection_d6vvu_25",z="_topTextSection_d6vvu_45",J="_text_d6vvu_59",K="_textTitle_d6vvu_71",U="_sectionImagesGroup_d6vvu_83",X="_sectionImageContainer_d6vvu_97",Y="_sectionTextContainer_d6vvu_111",Z="_sectionWrapper_d6vvu_119",r={bannerContainer:M,topSection:Q,topTextSection:z,text:J,textTitle:K,sectionImagesGroup:U,sectionImageContainer:X,sectionTextContainer:Y,sectionWrapper:Z},ee="_hoverContainer_19oqf_1",te="_titleText_19oqf_21",ae="_showcaseContainer_19oqf_33",se="_showcaseWrapper_19oqf_61",o={hoverContainer:ee,titleText:te,showcaseContainer:ae,showcaseWrapper:se};function ne(){const e=A("(max-width: 85em)")??!0;return n.jsxs(l,{className:o.showcaseWrapper,children:[n.jsx("div",{className:o.titleText,children:"Showcase"}),n.jsxs("div",{className:o.showcaseContainer,children:[[0,0,0,0].map((s,t)=>n.jsx("a",{"aria-label":c[t].ariaLabel,style:e?{}:{marginTop:`${t*50-(50*3*+(t>1)+50*.5)}%`},className:o.hoverContainer,"data-bottom-row":t>=2?!0:null,href:c[t].link,target:"_blank",children:n.jsx(x,{image:c[t].image,radius:"xl",loading:"eager"})},t)),n.jsx(B,{})]})]})}function re(){return n.jsx("a",{href:p.itchBanner.link,target:"_blank",className:r.bannerContainer,"aria-label":"itch.io banner",children:n.jsx(x,{image:p.itchBanner.image,radius:"xl",loading:"eager"})})}function ve(){return n.jsx(n.Fragment,{children:n.jsxs("div",{className:r.topSection,children:[n.jsx(ne,{}),n.jsxs("div",{className:r.topTextSection,children:[n.jsx("div",{className:r.textTitle,children:"WanSou"}),n.jsxs("div",{className:r.text,children:[n.jsx(_,{}),m[0]]}),n.jsx(re,{}),n.jsxs("div",{className:r.text,children:[n.jsx(_,{}),m[1]]})]})]})})}export{ve as default};
