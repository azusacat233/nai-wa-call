import * as THREE from 'three';

// Open optical housings: no cylinder end caps across the aiming axis.
export function buildOptic(root, info, kind, railY, z) {
  const body = new THREE.MeshStandardMaterial({color:0x282c29,metalness:.7,roughness:.38});
  const rubber = new THREE.MeshStandardMaterial({color:0x101413,roughness:.85});
  const glass = new THREE.MeshBasicMaterial({color:0x65d5be,transparent:true,opacity:.075,depthWrite:false,side:THREE.DoubleSide});
  const light = new THREE.MeshBasicMaterial({color:0xff3823,toneMapped:false,depthWrite:false});
  const optic = new THREE.Group(); optic.name='Optic-'+kind; root.add(optic);
  const mesh=(geometry,material,x,y,zz)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,zz);optic.add(m);return m;};
  const box=(w,h,d,x,y,zz,material=body)=>mesh(new THREE.BoxGeometry(w,h,d),material,x,y,zz);
  const tube=(r,length,x,y,zz)=>{
    mesh(new THREE.CylinderGeometry(r,r,length,32,1,true).rotateX(Math.PI/2),body,x,y,zz).material.side=THREE.DoubleSide;
    for(const end of [-1,1])mesh(new THREE.RingGeometry(r-.003,r,32),body,x,y,zz+end*length/2).material.side=THREE.DoubleSide;
  };
  const y=railY+.057;
  box(.045,.014,.09,0,railY+.009,z);box(.032,.018,.042,0,railY+.024,z);
  // Mount clamp and adjustment controls remain visible in hip-fire and lobby views.
  for(const zz of [z-.028,z+.028])box(.012,.009,.009,.028,railY+.012,zz,rubber);
  let back=.23;
  if(kind==='holo'){
    const rounded=(path,w,h,r)=>{path.moveTo(-w/2+r,-h/2);path.lineTo(w/2-r,-h/2);path.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);path.lineTo(w/2,h/2-r);path.quadraticCurveTo(w/2,h/2,w/2-r,h/2);path.lineTo(-w/2+r,h/2);path.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);path.lineTo(-w/2,-h/2+r);path.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return path;};
    const shape=rounded(new THREE.Shape(),.061,.061,.009),hole=rounded(new THREE.Path(),.046,.045,.006);shape.holes.push(hole);
    mesh(new THREE.ExtrudeGeometry(shape,{depth:.035,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.0012,bevelThickness:.0012,curveSegments:8}),body,0,y,z-.018);
    box(.061,.012,.066,0,y-.032,z);
    for(const x of [-.026,.026])for(const yy of [-.022,.022])mesh(new THREE.CircleGeometry(.0017,10),rubber,x,y+yy,z+.0195);
    box(.047,.016,.03,0,y-.038,z-.046,rubber);
    mesh(new THREE.PlaneGeometry(.047,.046),glass,0,y,z-.019);
    box(.009,.017,.023,.034,y-.009,z+.006,rubber);
  }else{
    const long=kind==='sniper',magnified=long||kind==='acog'||kind==='thermal';
    const length=long?.23:magnified?.12:.062;
    const radius=long?.027:magnified?.025:.024;
    tube(radius,length,0,y,z);tube(radius+.002,.009,0,y,z+length/2);
    tube(radius+.003,.013,0,y,z-length/2);
    mesh(new THREE.CircleGeometry(radius-.003,32),glass,0,y,z-length/2+.002);
    box(.015,.015,.022,radius+.006,y,z);box(.019,.013,.02,0,y+radius+.004,z);
    if(kind==='thermal')box(.025,.034,.058,.034,y,z);
    back=length/2+.095;
  }
  const reticle=new THREE.Group();reticle.name='IlluminatedReticle';reticle.position.set(0,y,z-.024);optic.add(reticle);
  const dot=new THREE.Mesh(new THREE.CircleGeometry(.00065,16),light);reticle.add(dot);
  if(kind==='holo')reticle.add(new THREE.Mesh(new THREE.RingGeometry(.0044,.00485,48),light));
  if(kind==='acog'||kind==='thermal'||kind==='sniper'){
    for(const [w,h] of [[.025,.00045],[.00045,.025]])reticle.add(new THREE.Mesh(new THREE.PlaneGeometry(w,h),light));
  }
  info.reticle=reticle;info.optic=kind;info.sight.set(0,y,z+back);
  return optic;
}
