import{f as B,u as H,a as M,R as b,B as z,c as F,g as V,r as N,j as e,I as j,b as I,s as m,T as p,d as v,S as y,e as L,m as w}from"./index-39a656dd.js";import{S,c as Q,a as C,C as q}from"./Star-6d2952d8.js";import{T as x}from"./Title-b8953098.js";var J={root:"m-6d731127"};const O=J;var K=Object.defineProperty,U=Object.defineProperties,X=Object.getOwnPropertyDescriptors,d=Object.getOwnPropertySymbols,W=Object.prototype.hasOwnProperty,A=Object.prototype.propertyIsEnumerable,k=(t,a,s)=>a in t?K(t,a,{enumerable:!0,configurable:!0,writable:!0,value:s}):t[a]=s,T=(t,a)=>{for(var s in a||(a={}))W.call(a,s)&&k(t,s,a[s]);if(d)for(var s of d(a))A.call(a,s)&&k(t,s,a[s]);return t},Y=(t,a)=>U(t,X(a)),Z=(t,a)=>{var s={};for(var n in t)W.call(t,n)&&a.indexOf(n)<0&&(s[n]=t[n]);if(t!=null&&d)for(var n of d(t))a.indexOf(n)<0&&A.call(t,n)&&(s[n]=t[n]);return s};const ee={gap:"md",align:"stretch",justify:"flex-start"},ae=F((t,{gap:a,align:s,justify:n})=>({root:{"--stack-gap":V(a),"--stack-align":s,"--stack-justify":n}})),f=B((t,a)=>{const s=H("Stack",ee,t),n=s,{classNames:i,className:r,style:c,styles:l,unstyled:G,vars:P,align:ke,justify:Te,gap:be,variant:D}=n,E=Z(n,["classNames","className","style","styles","unstyled","vars","align","justify","gap","variant"]),R=M({name:"Stack",props:s,classes:O,className:r,style:c,classNames:i,styles:l,unstyled:G,vars:P,varsResolver:ae});return b.createElement(z,T(Y(T({ref:a},R("root")),{variant:D}),E))});f.classes=O;f.displayName="@mantine/core/Stack";const te="_bannerContainer_19dkh_1",se="_topSection_19dkh_23",ne="_topTextSection_19dkh_39",re="_homepageWrapper_19dkh_53",ie="_textTitle_19dkh_67",oe="_sectionImagesGroup_19dkh_73",ce="_sectionImageContainer_19dkh_87",le="_sectionTextContainer_19dkh_101",me="_sectionWrapper_19dkh_109",o={bannerContainer:te,topSection:se,topTextSection:ne,homepageWrapper:re,textTitle:ie,sectionImagesGroup:oe,sectionImageContainer:ce,sectionTextContainer:le,sectionWrapper:me};function $({starAmount:t=3,backgroundStarAmount:a=3}){const[s,n]=N.useState({foreground:new Array(t).fill(0).map(()=>new S),background:new Array(a).fill(0).map(()=>new S)});return e.jsxs("div",{className:Q.starryArea,children:[s.background.map((i,r)=>e.jsx(C,{starClass:i},r)),s.foreground.map((i,r)=>e.jsx(C,{starClass:i,foreground:!0},r))]})}const de="_floating_10gjl_51",pe="_hover_10gjl_1",ge="_container_10gjl_71",_e="_fadeInAnimation_10gjl_1",g={floating:de,hover:pe,container:ge,fadeInAnimation:_e};function u({image:t,radius:a=0,loading:s="lazy"}){const[n,i]=N.useState(Math.floor(Math.random()*-6500)),r=n>-3250?"normal":"reverse";return e.jsxs(q,{pos:"relative",className:g.container,"data-loaded":!0,size:"max",children:[e.jsx(j,{loading:s,height:"100%",left:"0",top:"0",fit:"cover","data-blurry":!0,"aria-hidden":!0,pos:"absolute",src:t,className:g.floating,style:{animationDelay:n+"ms",animationDirection:r}}),e.jsx(j,{loading:s,radius:a,src:t,className:g.floating,"aria-hidden":!0,style:{animationDelay:n+"ms",animationDirection:r}})]})}const he="_hoverContainer_t9xb3_1",xe="_showcaseContainer_t9xb3_23",fe="_showcaseWrapper_t9xb3_47",_={hoverContainer:he,showcaseContainer:xe,showcaseWrapper:fe};function ue(){const a=I("(max-width: 85em)")||!1;return e.jsxs(f,{className:_.showcaseWrapper,children:[e.jsx(x,{c:"text.0",ta:"center",children:"Showcase"}),e.jsxs("div",{className:_.showcaseContainer,children:[new Array(a?m.length/2:m.length).fill(0).map((s,n)=>e.jsx("a",{"aria-label":m[n].ariaLabel,style:a?{}:{marginTop:`${n*20-(20*3*+(n>1)+20*.5)}%`},className:_.hoverContainer,href:m[n].link,target:"_blank",children:e.jsx(u,{image:m[n].image,radius:"xl",loading:"eager"})},n)),e.jsx($,{})]})]})}const je="_gradientTitleContainer_ppxmf_1",ve="_gradientTitle_ppxmf_1",ye="_gradientGlow_ppxmf_23",h={gradientTitleContainer:je,gradientTitle:ve,gradientGlow:ye};function we({title:t,gradientColors:a}){return e.jsx("div",{className:h.gradientTitleContainer,children:e.jsxs(x,{className:h.gradientTitle,style:{backgroundImage:`linear-gradient(125deg, ${a[0]}, ${a[1]})`},children:[t,e.jsx("div",{className:h.gradientGlow,style:{backgroundImage:`linear-gradient(125deg, ${a[0]}, ${a[1]})`}})]})})}function Se({icons:t,children:a,side:s=!0}){const n=I("(min-width: 60em)"),i=[e.jsx("div",{className:o.sectionImagesGroup,children:t.map((c,l)=>e.jsxs("div",{className:o.sectionImageContainer,children:[e.jsx(u,{image:c}),e.jsx($,{})]},l))})],r=e.jsx("div",{className:o.sectionTextContainer,children:a.map(c=>c)});return s||n==!1?i.push(r):i.unshift(r),e.jsx("div",{className:o.sectionWrapper,children:i.map((c,l)=>e.jsx(b.Fragment,{children:c},l))})}function Ce(){return e.jsx(e.Fragment,{children:e.jsx("a",{href:w.itchBanner.link,target:"_blank",className:o.bannerContainer,"aria-hidden":!0,children:e.jsx(u,{image:w.itchBanner.image,radius:"xl",loading:"eager"})})})}function We(){return e.jsxs("div",{className:o.homepageWrapper,children:[e.jsxs("div",{className:o.topSection,children:[e.jsx(ue,{}),e.jsxs("div",{className:o.topTextSection,children:[e.jsx(x,{c:"text.0",className:o.textTitle,children:"WanSou"}),e.jsx(p,{c:"text.0",children:v[0]}),e.jsx(Ce,{}),e.jsx(p,{c:"text.0",children:v[1]})]}),e.jsx(y,{})]}),L.map((t,a)=>e.jsxs(Se,{icons:t.icons,side:a%2==1,children:[e.jsx(we,{title:t.title,gradientColors:t.gradientColors}),e.jsxs("div",{style:{position:"relative"},children:[e.jsx(y,{}),e.jsx(p,{c:"text.0",children:t.description})]})]},a))]})}export{We as default};
