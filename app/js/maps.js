import {buildOutpost,prepareOutpost} from './outpost.js';
export const MAPS={outpost:{id:'outpost',name:'海岸前哨',size:86,seed:51,surface:'concrete',styles:['ally','enemy'],
 env:{sky:'day',sunDir:[-.65,.62,-.42],sunColor:0xffe1ba,sun:2.8,hemi:.85,sky2:0xc4ddff,ground:0x655543,fog:0xa8bec9,fogDensity:.0026,turbidity:3.5,rayleigh:1.5,mie:.005,exposure:.9,envIntensity:.22,ambient:'wind',shadowRange:38},
 build:buildOutpost,afterBuild:prepareOutpost}};
