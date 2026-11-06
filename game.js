
(() => {
  const $ = id => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";

  const scene = $("scene");
  const cloud = $("cloud");
  const rainLayer = $("rainLayer");
  const aircraftLayer = $("aircraftLayer");
  const greenField = $("greenField");
  const pond = $("pond");

  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));

  const state = {
    stage: 0,
    humidity: 65,
    wind: 12,
    base: 5000,
    cloudGrowth: 0,
    rain: 0,
    drops: [],
    dragging: null,
    running: false,
    planes: [
      {x:180,y:360,label:"1"},
      {x:350,y:360,label:"2"},
      {x:520,y:360,label:"3"}
    ],
    last: performance.now()
  };

  function svgEl(tag,attrs,parent) {
    const el = document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([k,v]) =>
      el.setAttribute(k,v)
    );
    parent.appendChild(el);
    return el;
  }

  // เครื่องบินจำลอง
  function drawPlanes() {
    aircraftLayer.innerHTML = "";

    state.planes.forEach((p,i) => {
      const g = svgEl("g",{
        class:"aircraft",
        transform:`translate(${p.x} ${p.y})`,
        tabindex:"0",
        role:"button",
        "aria-label":`เครื่องบินลำที่ ${i+1}`
      },aircraftLayer);

      svgEl("circle",{
        cx:0,cy:0,r:29,fill:"transparent"
      },g);

      svgEl("path",{
        d:"M-27 0 L-8 -5 L3 -22 L10 -22 L8 -5 L27 0 L8 5 L10 17 L4 17 L-7 5 Z",
        fill:["#f5a623","#2786c8","#8b68c8"][i],
        stroke:"#17415f",
        "stroke-width":1.5
      },g);

      svgEl("circle",{
        cx:0,cy:-30,r:11,
        fill:"#fff",
        stroke:"#17415f"
      },g);

      const t = svgEl("text",{
        x:0,y:-26,
        "text-anchor":"middle",
        fill:"#17344b",
        "font-size":13,
        "font-weight":700
      },g);

      t.textContent = p.label;

      g.addEventListener("pointerdown",e=>{
        state.dragging=i;
        g.setPointerCapture(e.pointerId);
        e.preventDefault();
      });

      g.addEventListener("pointermove",e=>{
        if(state.dragging!==i)return;

        const pt=scene.createSVGPoint();
        pt.x=e.clientX;
        pt.y=e.clientY;

        const q=pt.matrixTransform(
          scene.getScreenCTM().inverse()
        );

        p.x=clamp(q.x,35,865);
        p.y=clamp(q.y,70,445);

        g.setAttribute(
          "transform",
          `translate(${p.x} ${p.y})`
        );

        checkPlane(i);
      });

      const end=()=>{
        if(state.dragging===i)
          state.dragging=null;
      };

      g.addEventListener("pointerup",end);
      g.addEventListener("pointercancel",end);
    });
  }

  // ตรวจสอบตำแหน่งเครื่องบิน
  function checkPlane(i) {
    const p=state.planes[i];

    const targets=[
      {x:450,y:350,radius:100},
      {x:450,y:260,radius:115},
      {x:450,y:145,radius:125}
    ];

    const target=targets[i];

    const close=Math.hypot(
      p.x-target.x,
      p.y-target.y
    )<target.radius;

    if(close && state.stage===i) {
      setStage(i+1);
    }
  }

  // เปลี่ยนขั้นตอน
  function setStage(n) {
    state.stage=n;

    const positions=[
      {x:450,y:350},
      {x:450,y:260},
      {x:450,y:145}
    ];

    state.planes.forEach((p,i)=>{
      if(i<n) {
        p.x=positions[i].x;
        p.y=positions[i].y;
      }
    });

    drawPlanes();
    updateUI();
  }

  // ข้อมูลทางวิทยาศาสตร์
  function updateUI() {
    const stages=[
      [
        "ยังไม่ได้เริ่มขั้นตอน",
        "—",
        "เลือกขั้นตอนเพื่อดูคำอธิบาย",
        "เมฆยังไม่ก่อตัว"
      ],
      [
        "ขั้นที่ 1: ก่อกวน",
        "ตัวอย่างในบทเรียน: โซเดียมคลอไรด์ (NaCl)",
        "แนวคิด: ส่งเสริมการเกิดแกนควบแน่นในเมฆที่เหมาะสม",
        "เมฆเริ่มก่อตัว"
      ],
      [
        "ขั้นที่ 2: เลี้ยงให้อ้วน",
        "ตัวอย่างในบทเรียน: สารดูดความชื้น เช่น แคลเซียมคลอไรด์ (CaCl₂)",
        "แนวคิด: สนับสนุนการเติบโตของเมฆและกระบวนการเกิดหยดน้ำ",
        "เมฆกำลังพัฒนาตัว"
      ],
      [
        "ขั้นที่ 3: โจมตี",
        "แนวคิดสารก่อเมฆ: ขึ้นกับว่าเป็นเมฆอุ่นหรือเมฆเย็น",
        "แนวคิด: ส่งเสริมการรวมตัวของหยดน้ำหรือผลึกน้ำแข็ง",
        "เมฆพัฒนาเต็มที่ รอเงื่อนไขการเกิดฝน"
      ]
    ];

    const s=stages[state.stage];

    $("scienceStage").textContent=s[0];
    $("scienceMaterial").textContent="สาร/แนวคิด: "+s[1];
    $("scienceRole").textContent="หน้าที่: "+s[2];
    $("scienceCloud").textContent="สภาพเมฆ: "+s[3];

    for(let i=1;i<=3;i++) {
      $("stageCard"+i).classList.toggle(
        "active",
        state.stage===i
      );

      $("stageState"+i).textContent=
        state.stage>=i?"✓ ผ่านแล้ว":"รอ";
    }

    $("missionStatus").textContent=
      state.stage===3
      ?"ครบ 3 ขั้นตอน"
      :state.stage
      ?`ขั้นที่ ${state.stage}/3`
      :"รอเริ่ม";
  }

  // ปรับค่าบรรยากาศ
  function updateAtmosphere() {
    state.base=Number($("baseAltitude").value);
    state.humidity=Number($("humidity").value);
    state.wind=Number($("wind").value);

    $("baseValue").textContent=
      state.base.toLocaleString("th-TH")+" ฟุต";

    $("baseReadout").textContent=
      state.base.toLocaleString("th-TH")+" ฟุต";

    $("humidityValue").textContent=
      state.humidity+"%";

    $("windValue").textContent=
      state.wind+" กม./ชม.";

    $("temperature").textContent=
      (28-(state.base-3000)*0.0015).toFixed(1)
      +"°C (ค่าจำลอง)";

    $("windDirection").textContent=
      "ตะวันออกเฉียงใต้";

    const top=state.base+
      Math.round(state.cloudGrowth*9000);

    $("topReadout").textContent=
      top.toLocaleString("th-TH")+" ฟุต";

    $("cloudTopLabel").querySelector("text").textContent=
      "ยอดเมฆ: "+top.toLocaleString("th-TH")+" ฟุต";

    $("cloudType").textContent=
      state.cloudGrowth>.7
      ?"เมฆก่อตัวสูง"
      :"เมฆกำลังพัฒนา";
  }

  // สร้างหยดฝน
  function addDrop() {
    const x=355+Math.random()*190;
    const y=205+Math.random()*35;

    const line=svgEl("line",{
      x1:x,y1:y,
      x2:x-4,y2:y+13,
      stroke:"#168bd0",
      "stroke-width":2,
      opacity:.8
    },rainLayer);

    state.drops.push({
      el:line,
      x:x,
      y:y,
      v:150+Math.random()*100
    });

    if(state.drops.length>100) {
      const old=state.drops.shift();
      old.el.remove();
    }
  }

  // ระบบจำลองภาพเคลื่อนไหว
  function animate(now) {
    const dt=Math.min(
      .05,
      (now-state.last)/1000
    );

    state.last=now;

    let target=0;

    if(state.stage===1) target=.28;
    if(state.stage===2) target=.65;
    if(state.stage===3) target=1;

    state.cloudGrowth+=(target-state.cloudGrowth)*
      Math.min(1,dt*.55);

    const scale=.55+state.cloudGrowth*.48;

    cloud.setAttribute(
      "transform",
      `translate(450 285) scale(${scale})`
    );

    $("cloudShadow").setAttribute(
      "opacity",
      .10+state.cloudGrowth*.28
    );

    // เงื่อนไขการเกิดฝนในแบบจำลอง
    const canRain=
      state.stage===3 &&
      state.humidity>=60 &&
      state.cloudGrowth>.8;

    if(canRain) {
      state.rain=Math.min(
        100,
        state.rain+dt*(state.humidity/100)*.9
      );

      if(Math.random()<dt*18) {
        addDrop();
      }

      greenField.setAttribute(
        "opacity",
        Math.min(.75,state.rain/90)
      );

      pond.setAttribute(
        "opacity",
        .45+Math.min(.5,state.rain/180)
      );
    }

    // การเคลื่อนที่ของหยดฝน
    state.drops.forEach(d=>{
      d.y+=d.v*dt;
      d.x-=state.wind*.12*dt;

      d.el.setAttribute("x1",d.x);
      d.el.setAttribute("y1",d.y);
      d.el.setAttribute("x2",d.x-4);
      d.el.setAttribute("y2",d.y+13);

      if(d.y>470) {
        d.el.remove();
        d.dead=true;
      }
    });

    state.drops=state.drops.filter(d=>!d.dead);

    $("rainReadout").textContent=
      state.rain.toFixed(1)+" มม. (จำลอง)";

    $("cloudStatus").textContent=
      canRain
      ?"กำลังเกิดฝน"
      :state.stage===0
      ?"ยังไม่ก่อตัว"
      :state.stage===1
      ?"เริ่มก่อตัว"
      :state.stage===2
      ?"กำลังเติบโต"
      :"เมฆพัฒนา แต่เงื่อนไขฝนยังไม่ครบ";

    updateAtmosphere();

    requestAnimationFrame(animate);
  }

  // ตัวปรับค่าต่าง ๆ
  $("baseAltitude").addEventListener(
    "input",updateAtmosphere
  );

  $("humidity").addEventListener(
    "input",updateAtmosphere
  );

  $("wind").addEventListener(
    "input",updateAtmosphere
  );

  // เล่นอัตโนมัติ
  $("autoBtn").addEventListener("click",async()=>{
    if(state.running)return;

    state.running=true;
    $("autoBtn").disabled=true;
    $("autoBtn").textContent="กำลังจำลอง...";

    setStage(1);
    await new Promise(r=>setTimeout(r,1800));

    setStage(2);
    await new Promise(r=>setTimeout(r,1800));

    setStage(3);

    state.running=false;
    $("autoBtn").disabled=false;
    $("autoBtn").textContent="▶ เริ่มจำลองอัตโนมัติ";
  });

  // รีเซ็ต
  $("resetBtn").addEventListener("click",()=>{
    state.stage=0;
    state.cloudGrowth=0;
    state.rain=0;
    state.running=false;

    state.drops.forEach(d=>d.el.remove());
    state.drops=[];

    greenField.setAttribute("opacity",0);
    pond.setAttribute("opacity",.65);

    state.planes=[
      {x:180,y:360,label:"1"},
      {x:350,y:360,label:"2"},
      {x:520,y:360,label:"3"}
    ];

    $("autoBtn").disabled=false;
    $("autoBtn").textContent="▶ เริ่มจำลองอัตโนมัติ";

    drawPlanes();
    updateUI();
  });

  // โหมดมืด
  $("themeBtn").addEventListener("click",()=>{
    const root=document.documentElement;

    const next=
      root.dataset.theme==="dark"
      ?"light"
      :"dark";

    root.dataset.theme=next;

    $("themeBtn").textContent=
      next==="dark"
      ?"☀️ โหมดสว่าง"
      :"🌙 โหมดมืด";

    try {
      localStorage.setItem("rain-sim-theme",next);
    } catch(e) {}
  });

  // จำโหมดที่เลือก
  try {
    const saved=localStorage.getItem("rain-sim-theme");

    if(saved) {
      document.documentElement.dataset.theme=saved;

      $("themeBtn").textContent=
        saved==="dark"
        ?"☀️ โหมดสว่าง"
        :"🌙 โหมดมืด";
    }
  } catch(e) {}

  // เต็มจอ
  $("fullscreenBtn").addEventListener("click",async()=>{
    try {
      if(!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch(e) {
      alert("เบราว์เซอร์นี้ไม่อนุญาตให้เปิดเต็มจอ");
    }
  });

  document.addEventListener("fullscreenchange",()=>{
    $("fullscreenBtn").textContent=
      document.fullscreenElement
      ?"✕ ออกจากเต็มจอ"
      :"⛶ เต็มจอ";
  });

  // เริ่มระบบ
  drawPlanes();
  updateUI();
  updateAtmosphere();
  requestAnimationFrame(animate);

})();
