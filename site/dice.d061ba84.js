!function(){n([1,2,3,4,5,6]),n([1,2,3,4,5,6,7,8]);var r=n(["AD","BD","P","P","DS","DD"]);!function(r,t){t=t||l;var a=r.shift().values,e=!0,o=!1,u=void 0;try{for(var i,f=r[Symbol.iterator]();!(e=(i=f.next()).done);e=!0){var y=i.value,v=[],c=!0,h=!1,d=void 0;try{for(var s,S=a[Symbol.iterator]();!(c=(s=S.next()).done);c=!0){var b=s.value,m=!0,w=!1,x=void 0;try{for(var D,p,P=y.values[Symbol.iterator]();!(m=(D=P.next()).done);m=!0)p=D.value,v.push(t(b,p))}catch(r){w=!0,x=r}finally{try{m||null==P.return||P.return()}finally{if(w)throw x}}}}catch(r){h=!0,d=r}finally{try{c||null==S.return||S.return()}finally{if(h)throw d}}a=v}}catch(r){o=!0,u=r}finally{try{e||null==f.return||f.return()}finally{if(o)throw u}}n(a)}([r,r]);function t(r){var t,n=[],l=!0,a=!1,e=void 0;try{for(var o,u,i=r[Symbol.iterator]();!(l=(o=i.next()).done);l=!0){u=o.value,t=!1;var f=!0,y=!1,v=void 0;try{for(var c,h,d=n[Symbol.iterator]();!(f=(c=d.next()).done);f=!0)h=c.value,t=t||_.isEqual(u,h)}catch(r){y=!0,v=r}finally{try{f||null==d.return||d.return()}finally{if(y)throw v}}t||n.push(u)}}catch(r){a=!0,e=r}finally{try{l||null==i.return||i.return()}finally{if(a)throw e}}return n}function n(r){return{values:r,range:t(r)}}function l(r,t){return"array"==typeof r?[t]+r:[r,t]}}();
//# sourceMappingURL=dice.d061ba84.js.map
