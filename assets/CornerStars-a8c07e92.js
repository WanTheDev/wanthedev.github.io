import{r as e,m as s}from"./index-a2fa107f.js";import{S as n,c as m,a as u}from"./Star-fa8f07e6.js";const p=(r=Math.round(Math.random()))=>[3-r,r];function x({starPreset:r}){const[t,c]=e.useState((r??p()).map(a=>new n(a)));return s.jsx("p",{className:m.starryArea,"data-foreground":!0,children:t.map((a,o)=>s.jsx(u,{starClass:a,foreground:!0},o))})}export{x as C};
