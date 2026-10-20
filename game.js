(() => {
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const COLS = 40, ROWS = 28;
  
  // ขนาดบล็อก Isometric
  const TILE_W = 64, TILE_H = 32;

  const map = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => {
    if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) return 1;
    if ((x % 8 === 0 && y % 7 !== 0) || (y % 7 === 0 && x % 8 !== 0)) return 2;
    if (((x * 17 + y * 11) % 29 === 0) || ((x * 7 + y * 13) % 47 === 0)) return 3;
    return 0;
  }));

  const places = [
    { id: 'pharmacy', name: 'ร้านขายยา', x: 5, y: 5, kind: 'start', desc: 'ชั้นวางของกระจัดกระจาย มีรอยเลือดลากไปทางประตูหลัง' },
    { id: 'shelter', name: 'ศูนย์พักพิงโรงเรียน', x: 13, y: 7, kind: 'shelter', desc: 'มีแสงไฟลอดจากหน้าต่างและเสียงคนทะเลาะกันเรื่องอาหาร' },
    { id: 'police', name: 'สถานีตำรวจ', x: 24, y: 7, kind: 'police', desc: 'รถตำรวจชนประตู มีเสียงวิทยุเรียกกำลังเสริมซ้ำ ๆ' },
    { id: 'hospital', name: 'โรงพยาบาลเซนต์ออรา', x: 32, y: 5, kind: 'hospital', desc: 'อาคารมืดสนิท ป้ายทางเข้าถูกขีดทับด้วยคำว่า “อย่าเชื่อผลตรวจ”' },
    { id: 'subway', name: 'ทางลงรถไฟใต้ดิน', x: 9, y: 16, kind: 'subway', desc: 'ลมเย็นพัดขึ้นมาจากอุโมงค์ มีรอยข่วนด้านในประตู' },
    { id: 'market', name: 'ตลาดกลางคืน', x: 19, y: 17, kind: 'market', desc: 'แผงขายของถูกทิ้งไว้เหมือนทุกคนหนีไปพร้อมกัน' },
    { id: 'radio', name: 'หอส่งสัญญาณ', x: 31, y: 16, kind: 'radio', desc: 'เสาส่งสัญญาณเอียง แต่เครื่องกำเนิดไฟฟ้าอาจยังซ่อมได้' },
    { id: 'bridge', name: 'สะพานอรุณ', x: 35, y: 23, kind: 'bridge', desc: 'สะพานเป็นทางออกจากเมือง แต่มีรถบรรทุกขวางและเสียงฝูงซอมบี้อยู่ไกล ๆ' },
    { id: 'lab', name: 'ห้องทดลองใต้ดิน', x: 21, y: 24, kind: 'lab', desc: 'ประตูเหล็กมีตราบริษัท Helix และช่องใส่บัตรเจ้าหน้าที่' }
  ];

  const ZOMBIE_TYPES = {
    walker: { name: 'Walker', hp: 2, color: '#9e5c54', speed: 0.035, dmg: 3, alertDist: 4 },
    runner: { name: 'Runner', hp: 1, color: '#d9534f', speed: 0.08, dmg: 5, alertDist: 7 },
    brute:  { name: 'Brute',  hp: 5, color: '#5b3256', speed: 0.02, dmg: 10, alertDist: 3 }
  };

  let Z = initial();
  let moveHold = null;

  function log(s) {
    Z.feed.unshift(`[${clock()}] ${s}`);
    Z.feed = Z.feed.slice(0, 16);
    renderUI();
  }

  function clock() {
    let mins = Z.minutes;
    return `${String(21 + Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }

  function has(i) { return Z.inventory.includes(i); }
  function add(i) { if (!has(i)) { Z.inventory.push(i); log('ได้รับ: ' + i); } }
  function remove(i) { Z.inventory = Z.inventory.filter(v => v !== i); }

  function timePass(n = 2) {
    Z.minutes += n;
    if (Z.minutes >= 60) {
      Z.day += Math.floor(Z.minutes / 60);
      Z.minutes %= 60;
    }
    Z.noise = Math.max(0, Z.noise - 1);
    if (Z.steps % 6 === 0 && Math.random() < .23) {
      Z.sanity = Math.max(0, Z.sanity - 1);
    }
  }

  function tile(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return 1;
    return map[Math.floor(y)][Math.floor(x)];
  }

  function blocked(x, y) { return tile(x, y) === 1; }
  function nearPlace() { return places.find(p => Math.hypot(p.x + .5 - Z.x, p.y + .5 - Z.y) < 1.7); }

  // 🎮 ระบบควบคุมทิศทางใหม่ (Screen-Aligned Movement เข้ากับมุมกล้องพอดี)
  function moveScreenDirection(dir) {
    if (Z.ending) return;
    
    // แปลงทิศทางบนจอให้ตรงกับโลก Isometric แบบเป๊ะๆ
    // Up = ขึ้นจอ, Down = ลงจอ, Left = ซ้ายจอ, Right = ขวาจอ
    let dx = 0, dy = 0;
    const speed = 0.22;

    if (dir === 'up')    { dx = -speed; dy = -speed; }
    if (dir === 'down')  { dx = speed;  dy = speed; }
    if (dir === 'left')  { dx = -speed; dy = speed; }
    if (dir === 'right') { dx = speed;  dy = -speed; }

    let nx = Z.x + dx, ny = Z.y + dy;
    if (!blocked(nx, ny) && !blocked(nx + 0.1, ny + 0.1)) {
      Z.x = nx; Z.y = ny;
      Z.steps++;
      timePass(1);
      updateZombiesAI();
      if (Z.steps % 7 === 0 && Math.random() < .30) spawnZombie();
      checkEncounter();
      render();
    }
  }

  function updateZombiesAI() {
    Z.zombies.forEach(z => {
      let typeData = ZOMBIE_TYPES[z.type || 'walker'];
      let d = Math.hypot(Z.x - z.x, Z.y - z.y);
      let effectiveAlertDist = typeData.alertDist + (Z.noise * 1.2);

      if (d < effectiveAlertDist) {
        let angle = Math.atan2(Z.y - z.y, Z.x - z.x);
        let nx = z.x + Math.cos(angle) * typeData.speed;
        let ny = z.y + Math.sin(angle) * typeData.speed;
        if (!blocked(nx, ny)) { z.x = nx; z.y = ny; }
      } else {
        if (Math.random() < 0.2) {
          let rx = z.x + (Math.random() - 0.5) * 0.3;
          let ry = z.y + (Math.random() - 0.5) * 0.3;
          if (!blocked(rx, ry)) { z.x = rx; z.y = ry; }
        }
      }
    });
  }

  function spawnZombie() {
    let a = Math.random() * Math.PI * 2;
    let zx = Math.max(1, Math.min(COLS - 2, Z.x + Math.cos(a) * 5)),
        zy = Math.max(1, Math.min(ROWS - 2, Z.y + Math.sin(a) * 5));
    
    if (!blocked(zx, zy)) {
      let rand = Math.random();
      let type = rand < 0.25 ? 'runner' : rand < 0.40 ? 'brute' : 'walker';
      let typeData = ZOMBIE_TYPES[type];
      Z.zombies.push({ x: zx, y: zy, type: type, hp: typeData.hp });
    }
  }

  function checkEncounter() {
    Z.zombies.forEach(z => {
      let typeData = ZOMBIE_TYPES[z.type || 'walker'];
      let d = Math.hypot(Z.x - z.x, Z.y - z.y);
      if (d < .75) {
        Z.hp = Math.max(0, Z.hp - typeData.dmg);
        Z.sanity = Math.max(0, Z.sanity - 2);
        log(`🚨 โดน ${typeData.name} โจมตี! (-${typeData.dmg} HP)`);
      }
    });
    if (Z.hp <= 0) gameOver('คุณล้มลงในความมืด', 'คุณบาดเจ็บเกินกว่าจะเดินต่อได้...');
  }

  function nearbyZombie() { return Z.zombies.find(z => Math.hypot(z.x - Z.x, z.y - Z.y) < 1.8); }

  function attack() {
    if (Z.ending) return;
    let z = nearbyZombie();
    if (z) {
      let typeData = ZOMBIE_TYPES[z.type || 'walker'];
      if (Z.ammo > 0) {
        Z.ammo--; z.hp -= 2; Z.noise = 6;
        log(`💥 ยิงใส่ ${typeData.name}! เสียงปืนดังก้อง`);
      } else {
        z.hp -= 1; Z.hp = Math.max(0, Z.hp - typeData.dmg); Z.noise = 3;
        log(`🔪 ใช้มีดแทง ${typeData.name}! ถูกสวนกลับเล็กน้อย`);
      }
      if (z.hp <= 0) {
        Z.zombies = Z.zombies.filter(q => q !== z);
        Z.kills++;
        log(`☠️ กำจัด ${typeData.name} สำเร็จ!`);
      }
      timePass(3); checkEncounter(); render();
    } else {
      show('ไม่มีเป้าหมาย', 'ไม่มีผู้ติดเชื้ออยู่ในระยะประชิด');
    }
  }

  function sneak() {
    Z.noise = 0; Z.sanity = Math.max(0, Z.sanity - 1);
    timePass(3);
    log('🤫 คุณย่องเบา หมอบต่ำ ลดเสียงฝีเท้า');
    render();
  }

  function interact() {
    if (Z.ending) return;
    let p = nearPlace();
    if (!p) {
      let z = nearbyZombie();
      if (z) { show('เสียงหายใจใกล้ตัว', 'มีผู้ติดเชื้ออยู่ใกล้มาก!'); return; }
      show('ไม่มีอะไรใกล้ตัว', 'เดินเข้าไปใกล้สถานที่หรือเครื่องหมายบนแผนที่');
      return;
    }
    visit(p);
  }

  function visit(p) {
    if (!Z.visited.includes(p.id)) { Z.visited.push(p.id); log('ค้นพบสถานที่: ' + p.name); }
    Z.zone = p.name;
    const opts = [];

    if (p.id === 'pharmacy') {
      opts.push(['ค้นลิ้นชักเก็บยา', () => {
        if (!Z.flags.med) {
          Z.flags.med = true; add('ชุดปฐมพยาบาล'); add('แบตเตอรี่');
          Z.hp = Math.min(100, Z.hp + 5);
          Z.clues.push('แบตเตอรี่จากร้านขายยาอาจทำให้วิทยุใช้งานได้');
          log('คุณพบแบตเตอรี่และชุดปฐมพยาบาล');
          Z.quests.main = Math.max(Z.quests.main, 1);
        } else log('ลิ้นชักว่างเปล่า');
      }]);
      opts.push(['เปิดวิทยุพัง', () => {
        if (has('แบตเตอรี่')) {
          remove('วิทยุพัง'); add('วิทยุใช้งานได้'); Z.flags.radioFixed = true;
          log('วิทยุมีเสียงแทรก...');
          show('เสียงจากวิทยุ', 'เสียงผู้หญิง: “ลินยังมีชีวิต… ห้องทดลองใต้ดิน… หาแฟ้มสีขาว”', [
            ['รับข้อความและตามหาลิน', () => { Z.quests.main = 1; Z.trust.lin = 1; renderUI(); }],
            ['มุ่งไปจุดอพยพ', () => { Z.flags.doubt = true; Z.quests.main = 2; renderUI(); }]
          ]);
        } else show('วิทยุยังใช้ไม่ได้', 'ต้องหาแบตเตอรี่ก่อน');
      }]);
      opts.push(['ออกสำรวจ', () => close()]);
    } else if (p.id === 'shelter') {
      opts.push(['คุยกับหัวหน้าศูนย์พักพิง', () => {
        show('อร (หัวหน้าศูนย์)', '“เราต้องการยาปฏิชีวนะ คนสถานีตำรวจขโมยไป”', [
          ['รับปากช่วยหาเวชภัณฑ์', () => { Z.trust.shelter += 2; Z.quests.side.push('หาเวชภัณฑ์'); log('คุณรับปากช่วย'); }],
          ['ขออาหารแลกเปลี่ยน', () => { Z.food++; log('ได้อาหาร 1 หน่วย'); }]
        ]);
      }]);
      opts.push(['พักผ่อน (ใช้ 1 อาหาร)', () => {
        if (Z.food > 0) { Z.food--; Z.hp = Math.min(100, Z.hp + 18); Z.sanity = Math.min(100, Z.sanity + 12); timePass(40); log('พักผ่อนปลอดภัย'); }
        else show('อาหารหมด', 'ไม่มีอาหารสำหรับฟื้นพลัง');
      }]);
    } else if (p.id === 'police') {
      opts.push(['ค้นห้องหลักฐาน', () => {
        if (!Z.flags.keycard) { Z.flags.keycard = true; add('บัตรเจ้าหน้าที่'); add('กระสุน'); Z.ammo += 3; log('พบบัตรเจ้าหน้าที่และกระสุน'); }
        else log('ค้นไปแล้ว');
      }]);
    } else if (p.id === 'hospital') {
      opts.push(['สำรวจโรงพยาบาล', () => {
        if (!Z.flags.hospital) {
          Z.flags.hospital = true; Z.sanity -= 8;
          show('โรงพยาบาลเซนต์ออรา', 'พบข้อมูลว่าลินถูกย้ายไปยังห้องทดลอง Helix ใต้ดิน', [
            ['ตามรอยไปห้องทดลอง', () => { Z.quests.main = 3; renderUI(); }],
            ['หยิบยาแล้วถอยออก', () => { add('ยาระงับปวด'); Z.hp = Math.min(100, Z.hp + 8); }]
          ]);
        } else show('โรงพยาบาล', 'คุณได้ข้อมูลครบแล้ว');
      }]);
    } else if (p.id === 'radio') {
      opts.push(['ซ่อมเครื่องส่งสัญญาณ', () => {
        if (has('แบตเตอรี่') && Z.flags.keycard) {
          show('สัญญาณตอบกลับ', '“มารอที่สะพานก่อนรุ่งเช้า”', [
            ['ส่งพิกัดให้ศูนย์พักพิง', () => { Z.flags.rescueShelter = true; Z.quests.main = 4; }],
            ['ตามหาลินก่อน', () => { Z.flags.rescueLin = true; Z.quests.main = 3; }]
          ]);
        } else show('อุปกรณ์ไม่พอ', 'ต้องมีแบตเตอรี่และบัตรเจ้าหน้าที่');
      }]);
    } else if (p.id === 'bridge') {
      opts.push(['ข้ามสะพานหนีออกจากเมือง', () => endingChoice()]);
    } else if (p.id === 'lab') {
      opts.push(['เปิดประตูห้องทดลอง', () => {
        if (has('บัตรเจ้าหน้าที่')) {
          show('แฟ้มสีขาว', 'ความจริงเบื้องหลังโครงการ Helix ถูกเปิดเผย...', [
            ['ช่วยลินและทำลายหลักฐาน', () => { Z.flags.saveLin = true; Z.trust.lin += 3; }],
            ['ส่งข้อมูลให้หน่วยอพยพ', () => { Z.flags.expose = true; }]
          ]);
        } else show('ประตูล็อก', 'ต้องใช้บัตรเจ้าหน้าที่');
      }]);
    }

    if (!opts.length) opts.push(['ตรวจดูสถานที่', () => log(p.desc)]);
    show(p.name, p.desc, opts);
  }

  function endingChoice() {
    show('รุ่งอรุณ', 'หน่วยอพยพจอดรอที่สะพาน คุณจะทำอย่างไร?', [
      ['พาลินหนีไปด้วยกัน', () => end('ครอบครัว', 'คุณพาลินข้ามสะพานสู่ความปลอดภัย')],
      ['เปิดโปง Helix', () => end('ความจริง', 'ความจริงถูกเผยแพร่สู่โลกภายนอก')]
    ]);
  }

  function show(title, body, opts = []) {
    document.getElementById('dlgTitle').textContent = title;
    document.getElementById('dlgBody').textContent = body;
    let el = document.getElementById('dlgOptions');
    el.innerHTML = '';
    opts.forEach(([label, fn]) => {
      let b = document.createElement('button');
      b.textContent = label;
      b.onclick = () => { document.getElementById('dlg').close(); fn(); render(); renderUI(); };
      el.appendChild(b);
    });
    document.getElementById('dlg').showModal();
  }

  function close() { document.getElementById('dlg').close(); }

  function end(title, body) {
    Z.ending = { title, body };
    show('จบเกม: ' + title, body, [['เริ่มใหม่', () => { Z = initial(); render(); renderUI(); }]]);
  }

  function gameOver(title, body) {
    Z.ending = { title, body };
    show(title, body, [['เริ่มใหม่', () => { Z = initial(); render(); renderUI(); }]]);
  }

  function initial() {
    return {
      x: 5.5, y: 6.5, hp: 100, sanity: 86, food: 2, ammo: 3, noise: 0, day: 1, minutes: 17,
      zone: 'เขตชานเมือง', inventory: ['ไฟฉาย', 'วิทยุพัง', 'มีดพก'],
      clues: ['ข้อความจากลินกล่าวถึงโรงพยาบาล'], flags: {}, quests: { main: 0, side: [] },
      trust: { lin: 0, mark: 0, shelter: 0 }, kills: 0, ending: null,
      feed: ['[21:17] คุณฟื้นขึ้นมาท่ามกลางความมืด'], visited: [], zombies: [], steps: 0
    };
  }

  function renderUI() {
    document.getElementById('hp').textContent = Z.hp;
    document.getElementById('sanity').textContent = Z.sanity;
    document.getElementById('food').textContent = Z.food;
    document.getElementById('ammo').textContent = Z.ammo;
    document.getElementById('hpbar').style.width = Z.hp + '%';
    document.getElementById('zone').textContent = '📍 ' + Z.zone;
    document.getElementById('day').textContent = `🌘 วันที่ ${Z.day} · ${clock()}`;
    document.getElementById('noise').textContent = '🔉 เสียง: ' + (Z.noise > 3 ? 'สูง (อันตราย!)' : 'ต่ำ (ปลอดภัย)');
    document.getElementById('inventory').innerHTML = Z.inventory.map(i => `<span class="item">${i}</span>`).join('') || 'ว่าง';
    document.getElementById('clues').innerHTML = Z.clues.map(c => '• ' + c).join('<br>');
    document.getElementById('feed').textContent = Z.feed.join('\n');
    document.getElementById('status').textContent = Z.ending ? 'สถานะ: ' + Z.ending.title : 'สถานะ: กำลังสำรวจ';
  }

  // แปลงพิกัด Isometric
  function toIso(x, y) {
    let screenX = (x - y) * (TILE_W / 2);
    let screenY = (x + y) * (TILE_H / 2);
    return { x: screenX, y: screenY };
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let playerScreen = toIso(Z.x, Z.y);
    let camX = playerScreen.x - canvas.width / 2;
    let camY = playerScreen.y - canvas.height / 2;

    // 1. วาดพื้นผิวแผนที่ Isometric
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        let iso = toIso(x, y);
        let sx = iso.x - camX;
        let sy = iso.y - camY;

        if (sx < -TILE_W || sx > canvas.width + TILE_W || sy < -TILE_H || sy > canvas.height + TILE_H) continue;

        let t = map[y][x];
        
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + TILE_W / 2, sy + TILE_H / 2);
        ctx.lineTo(sx, sy + TILE_H);
        ctx.lineTo(sx - TILE_W / 2, sy + TILE_H / 2);
        ctx.closePath();

        ctx.fillStyle = t === 1 ? '#1c2620' : t === 2 ? '#2e3831' : t === 3 ? '#1f2923' : '#253229';
        ctx.fill();
        ctx.strokeStyle = '#37473e';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (t === 1) {
          ctx.fillStyle = '#141c17';
          ctx.fillRect(sx - 16, sy - 18, 32, 22);
          ctx.fillStyle = '#3a4a3f';
          ctx.fillRect(sx - 12, sy - 14, 24, 4);
        }
      }
    }

    // 2. จัดเรียงเลเยอร์วัตถุตามแกน Y (Y-Sorting) ให้ซ้อนทับกันถูกต้องแบบ 3 มิติ
    let renderList = [];

    places.forEach(p => {
      let iso = toIso(p.x + 0.5, p.y + 0.5);
      renderList.push({ type: 'place', y: p.y, x: p.x, sx: iso.x - camX, sy: iso.y - camY, data: p });
    });

    Z.zombies.forEach(z => {
      let iso = toIso(z.x, z.y);
      renderList.push({ type: 'zombie', y: z.y, x: z.x, sx: iso.x - camX, sy: iso.y - camY, data: z });
    });

    let pIso = toIso(Z.x, Z.y);
    renderList.push({ type: 'player', y: Z.y, x: Z.x, sx: pIso.x - camX, sy: pIso.y - camY });

    renderList.sort((a, b) => (a.y + a.x) - (b.y + b.x));

    // 3. วาดวัตถุลงบนจอ
    renderList.forEach(item => {
      if (item.sx < -60 || item.sx > canvas.width + 60 || item.sy < -60 || item.sy > canvas.height + 60) return;

      if (item.type === 'place') {
        let p = item.data;
        ctx.fillStyle = Z.visited.includes(p.id) ? '#9cae8c' : '#d4b36a';
        ctx.beginPath();
        ctx.arc(item.sx, item.sy - 10, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#101711';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.id === 'hospital' ? 'H' : p.id === 'police' ? 'P' : p.id === 'shelter' ? 'S' : p.id === 'bridge' ? 'B' : p.id === 'lab' ? 'L' : p.id === 'radio' ? 'R' : p.id === 'market' ? 'M' : 'T', item.sx, item.sy - 6);
        ctx.fillStyle = '#f1f2df';
        ctx.font = '11px system-ui';
        ctx.fillText(p.name, item.sx, item.sy - 26);
      } 
      else if (item.type === 'zombie') {
        let z = item.data;
        let typeData = ZOMBIE_TYPES[z.type || 'walker'];
        ctx.fillStyle = typeData.color;
        ctx.beginPath();
        ctx.arc(item.sx, item.sy - 8, z.type === 'brute' ? 14 : 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } 
      else if (item.type === 'player') {
        ctx.fillStyle = '#d8e5c7';
        ctx.beginPath();
        ctx.arc(item.sx, item.sy - 12, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#486e4d';
        ctx.fillRect(item.sx - 6, item.sy - 8, 12, 14);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('คุณ', item.sx, item.sy - 28);
      }
    });

    renderUI();
  }

  function save() {
    try {
      localStorage.setItem('lastlight_save', JSON.stringify(Z));
      show('บันทึกแล้ว', 'บันทึกความคืบหน้าเรียบร้อย');
    } catch (e) {
      show('บันทึกไม่ได้', 'เบราว์เซอร์ไม่อนุญาต');
    }
  }

  function load() {
    try {
      let s = localStorage.getItem('lastlight_save');
      if (!s) { show('ไม่มีเซฟ', 'ยังไม่พบบันทึกเกม'); return; }
      Z = JSON.parse(s); render(); show('โหลดสำเร็จ', 'ยินดีต้อนรับกลับมา');
    } catch (e) {
      show('โหลดไม่สำเร็จ', 'ข้อมูลเซฟไม่ถูกต้อง');
    }
  }

  document.getElementById('saveTop').onclick = save;
  document.getElementById('loadBtn').onclick = load;
  document.getElementById('restart').onclick = () => { if (confirm('เริ่มเกมใหม่?')) { Z = initial(); render(); } };
  document.getElementById('interact').onclick = interact;
  document.getElementById('attack').onclick = attack;
  document.getElementById('sneak').onclick = sneak;
  document.getElementById('mapBtn').onclick = () => show('แผนที่เมือง', places.map(p => `${Z.visited.includes(p.id)?'✓':'○'} ${p.name}`).join('\n'), [['ปิด', () => {}]]);
  document.getElementById('useFood').onclick = () => {
    if (Z.food > 0) { Z.food--; Z.hp = Math.min(100, Z.hp + 12); timePass(5); log('กินอาหาร ฟื้นฟูพลัง'); render(); }
    else show('ไม่มีอาหาร', 'หาเพิ่มที่ตลาดหรือศูนย์พักพิง');
  };
  document.getElementById('dlgClose').onclick = close;

  // ⌨️ ควบคุมผ่านแป้นพิมพ์ (คีย์บอร์ด)
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(k) && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      if (k === ' ') { e.preventDefault(); interact(); return; }
      e.preventDefault();
      if (k === 'arrowup' || k === 'w') moveScreenDirection('up');
      if (k === 'arrowdown' || k === 's') moveScreenDirection('down');
      if (k === 'arrowleft' || k === 'a') moveScreenDirection('left');
      if (k === 'arrowright' || k === 'd') moveScreenDirection('right');
    }
    if (k === 'e') interact();
    if (k === 'f') attack();
  });

  // 📱 ควบคุมผ่านปุ่ม D-Pad บนมือถือ (ตรงกับทิศทางจอเป๊ะๆ)
  document.querySelectorAll('[data-move]').forEach(b => {
    let [dx, dy] = b.dataset.move.split(',').map(Number);
    let dir = 'up';
    if (dx === 0 && dy === -1) dir = 'up';
    if (dx === 0 && dy === 1)  dir = 'down';
    if (dx === -1 && dy === 0) dir = 'left';
    if (dx === 1 && dy === 0)  dir = 'right';

    b.addEventListener('pointerdown', e => {
      e.preventDefault(); 
      moveScreenDirection(dir);
      moveHold = setInterval(() => moveScreenDirection(dir), 140);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { clearInterval(moveHold); moveHold = null; }));
  });

  Z.zombies = [
    { x: 8.5, y: 6.5, type: 'walker', hp: 2 },
    { x: 16.5, y: 9.5, type: 'runner', hp: 1 },
    { x: 23.5, y: 14.5, type: 'brute', hp: 5 }
  ];
  render();
})();
