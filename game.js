(() => {
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const TILE = 40, COLS = 40, ROWS = 28;
  
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
    return map[y][x];
  }

  function blocked(x, y) { return tile(Math.floor(x), Math.floor(y)) === 1; }
  function nearPlace() { return places.find(p => Math.hypot(p.x + .5 - Z.x, p.y + .5 - Z.y) < 1.7); }

  function move(dx, dy) {
    if (Z.ending) return;
    let nx = Z.x + dx * .28, ny = Z.y + dy * .28;
    if (!blocked(nx, ny) && !blocked(nx + 0.2, ny + 0.2)) {
      Z.x = nx; Z.y = ny;
      Z.steps++;
      timePass(1);
      if (Z.steps % 8 === 0 && Math.random() < .27) spawnZombie();
      checkEncounter();
      render();
    }
  }

  function spawnZombie() {
    let a = Math.random() * Math.PI * 2;
    let zx = Math.max(1, Math.min(COLS - 2, Z.x + Math.cos(a) * 4)),
        zy = Math.max(1, Math.min(ROWS - 2, Z.y + Math.sin(a) * 4));
    if (!blocked(zx, zy)) Z.zombies.push({ x: zx, y: zy, hp: 2 });
  }

  function checkEncounter() {
    Z.zombies.forEach(z => {
      let d = Math.hypot(z.x - Z.x, z.y - Z.y);
      if (d < .7 && Z.noise < 3) {
        Z.hp = Math.max(0, Z.hp - 3);
        Z.sanity = Math.max(0, Z.sanity - 1);
      }
    });
    if (Z.hp <= 0) gameOver('คุณล้มลงในความมืด', 'คุณบาดเจ็บเกินกว่าจะเดินต่อได้ ความทรงจำสุดท้ายคือเสียงวิทยุที่เรียกชื่อคุณ');
  }

  function nearbyZombie() { return Z.zombies.find(z => Math.hypot(z.x - Z.x, z.y - Z.y) < 1.8); }

  function attack() {
    if (Z.ending) return;
    let z = nearbyZombie();
    if (z) {
      if (Z.ammo > 0) {
        Z.ammo--; z.hp -= 2; Z.noise = 5;
        log('ยิงใส่ผู้ติดเชื้อ เสียงปืนดังสะท้อนทั่วถนน');
      } else {
        z.hp -= 1; Z.hp = Math.max(0, Z.hp - 5); Z.noise = 2;
        log('คุณใช้มีดแทงแล้วถอยหนี แต่ถูกข่วน');
      }
      if (z.hp <= 0) {
        Z.zombies = Z.zombies.filter(q => q !== z);
        Z.kills++;
        log('ผู้ติดเชื้อล้มลง แต่เสียงดังอาจเรียกตัวอื่นมา');
      }
      timePass(3); checkEncounter(); render();
    } else {
      show('ไม่มีเป้าหมาย', 'ไม่มีผู้ติดเชื้ออยู่ในระยะโจมตี');
    }
  }

  function sneak() {
    Z.noise = 0; Z.sanity = Math.max(0, Z.sanity - 1);
    timePass(3);
    log('คุณย่องช้า ๆ กลั้นหายใจและพยายามไม่ให้เกิดเสียง');
    render();
  }

  function interact() {
    if (Z.ending) return;
    let p = nearPlace();
    if (!p) {
      let z = nearbyZombie();
      if (z) { show('เสียงหายใจใกล้ตัว', 'มีผู้ติดเชื้ออยู่ใกล้มาก เลือกโจมตีหรือย่องหนี'); return; }
      show('ไม่มีอะไรใกล้ตัว', 'เดินเข้าไปใกล้ประตู สิ่งของ หรือสถานที่ที่ทำเครื่องหมายไว้บนแผนที่');
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
          Z.clues.push('วิทยุรับสัญญาณจากคนที่เรียกตัวเองว่า “หมอวี”');
          log('วิทยุมีเสียงแทรก ก่อนมีเสียงผู้หญิงพูดว่า “ลินยังมีชีวิต อย่าไปโรงพยาบาลคนเดียว”');
          show('เสียงจากวิทยุ', 'เสียงผู้หญิงขาด ๆ หาย ๆ: “ลินยังมีชีวิต… Helix… ห้องทดลองใต้ดิน… ถ้าอยากรู้ต้นตอ ให้หาแฟ้มสีขาว”', [
            ['รับข้อความและตามหาลิน', () => { Z.quests.main = 1; Z.clues.push('ลินอาจเกี่ยวข้องกับโครงการ Helix'); Z.trust.lin = 1; renderUI(); }],
            ['ไม่เชื่อและมุ่งไปจุดอพยพ', () => { Z.flags.doubt = true; Z.quests.main = 2; renderUI(); }]
          ]);
        } else show('วิทยุยังใช้ไม่ได้', 'ต้องหาแบตเตอรี่ก่อน');
      }]);
      opts.push(['ออกสำรวจถนน', () => { close(); }]);
    } else if (p.id === 'shelter') {
      opts.push(['คุยกับหัวหน้าศูนย์พักพิง', () => {
        show('หัวหน้าศูนย์พักพิง — อร', '“เรารับคนได้อีกไม่กี่คน มีอาหารพอถึงพรุ่งนี้ แต่คนของสถานีตำรวจขโมยยาปฏิชีวนะไป”', [
          ['สัญญาว่าจะหาเวชภัณฑ์', () => { Z.trust.shelter += 2; Z.quests.side.push('หาเวชภัณฑ์ให้ศูนย์พักพิง'); Z.clues.push('ศูนย์พักพิงต้องการเวชภัณฑ์'); log('คุณรับปากช่วยผู้รอดชีวิต'); }],
          ['ขออาหารแลกข้อมูล', () => {
            if (Z.trust.shelter === 0) { Z.food++; Z.trust.shelter--; log('คุณได้อาหารหนึ่งหน่วย แต่คนในศูนย์ไม่ค่อยไว้ใจ'); }
            else { Z.food++; log('อรแบ่งอาหารให้หนึ่งหน่วย'); }
          }],
          ['ปฏิเสธและเดินจากไป', () => { Z.trust.shelter--; log('อรจดจำการปฏิเสธของคุณ'); }]
        ]);
      }]);
      opts.push(['พักและฟื้นสติ (ใช้ 1 อาหาร)', () => {
        if (Z.food > 0) {
          Z.food--; Z.hp = Math.min(100, Z.hp + 18); Z.sanity = Math.min(100, Z.sanity + 12);
          timePass(40); log('คุณพักในห้องเรียนที่ล็อกประตูได้');
        } else show('อาหารไม่พอ', 'คุณไม่มีอาหารสำหรับพักฟื้น');
      }]);
    } else if (p.id === 'police') {
      opts.push(['ค้นห้องเก็บหลักฐาน', () => {
        if (!Z.flags.keycard) {
          Z.flags.keycard = true; add('บัตรเจ้าหน้าที่'); add('กระสุน');
          Z.ammo += 3; Z.clues.push('บันทึกตำรวจกล่าวถึงรถขนส่งจาก Helix');
          log('คุณพบหลักฐานการขนส่งผู้ติดเชื้ออย่างลับ ๆ');
        } else log('ห้องเก็บหลักฐานถูกค้นไปแล้ว');
      }]);
      opts.push(['ฟังวิทยุตำรวจ', () => {
        Z.clues.push('หน่วยอพยพจะปิดสะพานเมื่อถึงรุ่งเช้า'); Z.flags.bridgeTimer = true;
        log('วิทยุประกาศว่า สะพานอรุณจะถูกปิดในอีกไม่กี่ชั่วโมง');
      }]);
    } else if (p.id === 'hospital') {
      opts.push(['เข้าไปในโถงโรงพยาบาล', () => {
        if (!Z.flags.hospital) {
          Z.flags.hospital = true; Z.sanity -= 8;
          Z.clues.push('รายงานแพทย์ระบุว่าผู้ติดเชื้อบางรายยังตอบสนองต่อเสียงคนที่รัก');
          log('ในโถงมีเตียงว่างเรียงกันและรอยมือด้านในกระจก');
          show('โรงพยาบาลเซนต์ออรา', 'ลำโพงเปิดเอง: “ผู้ป่วยลิน วีระ… ย้ายไปยังสถานที่ Helix ใต้ดิน”', [
            ['ตามรอยไปห้องทดลอง', () => { Z.quests.main = 3; Z.clues.push('ลินถูกย้ายไปห้องทดลอง Helix'); renderUI(); }],
            ['ค้นหายาแล้วถอยออก', () => { add('ยาระงับปวด'); Z.hp = Math.min(100, Z.hp + 8); log('คุณหยิบยาได้ก่อนเสียงฝีเท้าจะใกล้เข้ามา'); }]
          ]);
        } else show('โรงพยาบาล', 'คุณได้ข้อมูลสำคัญแล้ว แต่ทุกนาทีที่อยู่ที่นี่เสี่ยงขึ้น');
      }]);
    } else if (p.id === 'subway') {
      opts.push(['ลงอุโมงค์ใต้ดิน', () => {
        if (Z.sanity < 25) {
          show('คุณไม่กล้าลงไป', 'สภาพจิตใจของคุณไม่พร้อมจะเผชิญความมืดนี้');
        } else {
          timePass(20); Z.sanity -= 5; Z.clues.push('รอยล้อรถเข็นมุ่งสู่ห้องทดลอง');
          show('อุโมงค์รถไฟ', 'ในความมืด คุณพบรถเข็นเวชภัณฑ์และได้ยินเสียงเคาะเป็นจังหวะจากหลังประตูนิรภัย', [
            ['เปิดประตูด้วยบัตรเจ้าหน้าที่', () => {
              if (has('บัตรเจ้าหน้าที่')) {
                add('แฟ้มสีขาว'); Z.clues.push('แฟ้ม Helix เชื่อมโยงการทดลองกับการระบาด');
                log('คุณอ่านแฟ้ม Helix: โครงการพยายามสร้างภูมิคุ้มกัน แต่การทดลองหลุดควบคุม');
              } else show('ประตูล็อก', 'ต้องมีบัตรเจ้าหน้าที่จากสถานีตำรวจ');
            }],
            ['ถอยกลับ', () => log('คุณตัดสินใจกลับขึ้นไปก่อน')]
          ]);
        }
      }]);
    } else if (p.id === 'market') {
      opts.push(['ค้นแผงขายของ', () => {
        if (!Z.flags.market) {
          Z.flags.market = true; Z.food += 2; add('ขวดน้ำ'); add('ผ้าพันแผล');
          log('คุณเก็บเสบียงได้ แต่ขวดแก้วตกกระแทกพื้นเสียงดัง'); Z.noise = 4; spawnZombie();
        } else log('คุณค้นตลาดไปแล้ว');
      }]);
      opts.push(['ตรวจบันทึกเสียงในร้าน', () => {
        Z.clues.push('เจ้าของร้านเห็นรถ Helix ขนคนก่อนการระบาด'); log('บันทึกเสียงพูดถึงรถตู้สีขาวที่มุ่งไปยังห้องทดลอง');
      }]);
    } else if (p.id === 'radio') {
      opts.push(['ซ่อมเครื่องส่งสัญญาณ', () => {
        if (has('แบตเตอรี่') && Z.flags.keycard) {
          Z.flags.signal = true; Z.clues.push('ส่งสัญญาณฉุกเฉินได้สำเร็จ'); Z.trust.shelter += 2;
          show('สัญญาณตอบกลับ', 'มีเสียงเจ้าหน้าที่ตอบว่า “ได้ยินแล้ว แต่เรารับได้เฉพาะคนที่มาถึงสะพานก่อนรุ่งเช้า”', [
            ['ส่งพิกัดให้ศูนย์พักพิง', () => { Z.flags.rescueShelter = true; Z.quests.main = 4; log('คุณส่งพิกัดศูนย์พักพิงให้หน่วยอพยพ'); }],
            ['เก็บช่องสัญญาณไว้ตามหาลิน', () => { Z.flags.rescueLin = true; Z.quests.main = 3; log('คุณเลือกตามหาลินก่อน แม้เวลาจะเหลือน้อย'); }]
          ]);
        } else show('อุปกรณ์ไม่ครบ', 'ต้องมีแบตเตอรี่และบัตรเจ้าหน้าที่เพื่อเปิดระบบควบคุม');
      }]);
    } else if (p.id === 'bridge') {
      opts.push(['ข้ามสะพาน', () => {
        if (Z.flags.labTruth || Z.flags.rescueShelter || Z.flags.rescueLin) { endingChoice(); }
        else show('ยังตัดสินใจไม่ได้', 'คุณยังไม่รู้ความจริงเกี่ยวกับ Helix และไม่รู้ว่าลินอยู่ที่ไหน สำรวจสถานที่อื่นก่อน หรือข้ามสะพานโดยไม่รู้คำตอบ', [
          ['หนีออกจากเมืองเดี๋ยวนี้', () => end('หนีรอดเพียงลำพัง', 'คุณข้ามสะพานได้ก่อนที่มันจะถูกปิด แต่คำถามเกี่ยวกับลินและ Helix จะตามหลอกหลอนคุณไปตลอดชีวิต')],
          ['กลับไปค้นหาความจริง', () => log('คุณตัดสินใจกลับไปก่อนรุ่งเช้า')]
        ]);
      }]);
    } else if (p.id === 'lab') {
      opts.push(['เปิดประตูห้องทดลอง', () => {
        if (has('บัตรเจ้าหน้าที่')) {
          Z.flags.labOpen = true; Z.flags.labTruth = true; Z.quests.main = 5;
          Z.clues.push('การระบาดเริ่มจากการทดลอง Helix ที่ถูกปกปิด');
          show('แฟ้มสีขาว', 'ข้อมูลเผยว่าการระบาดไม่ได้เกิดจากอุบัติเหตุธรรมดา ผู้บริหารสั่งปิดระบบเตือนภัยเพื่อขนย้ายตัวอย่าง และลินถูกใช้เป็นอาสาสมัครทดลองเพราะมีภูมิคุ้มกันบางส่วน', [
            ['ช่วยลินและทำลายข้อมูล', () => { Z.flags.saveLin = true; Z.trust.lin += 3; Z.hp -= 5; log('คุณช่วยลินออกมา แต่ทำลายหลักฐานบางส่วนเพื่อหยุดระบบกักกัน'); }],
            ['คัดลอกหลักฐานก่อนช่วยลิน', () => { Z.flags.evidence = true; add('หลักฐาน Helix'); Z.trust.lin++; log('คุณคัดลอกหลักฐานและเปิดห้องกักกัน ลินยังไม่แน่ใจว่าควรไว้ใจคุณ'); }],
            ['ปล่อยข้อมูลให้หน่วยอพยพ', () => { Z.flags.expose = true; Z.trust.shelter += 2; log('คุณส่งหลักฐานให้หน่วยอพยพเพื่อให้โลกภายนอกรู้ความจริง'); }]
          ]);
        } else show('ประตูล็อก', 'ต้องมีบัตรเจ้าหน้าที่จากสถานีตำรวจ');
      }]);
    }

    if (!opts.length) opts.push(['ตรวจดูสถานที่', () => log(p.desc)]);
    show(p.name, p.desc, opts);
  }

  function endingChoice() {
    show('ทางเลือกสุดท้าย', 'ฟ้ากำลังสว่าง หน่วยอพยพเรียกให้ทุกคนขึ้นรถ คุณมีเวลาเพียงไม่กี่นาที คุณจะให้ความสำคัญกับอะไร?', [
      ['พาลินไปด้วยและหนีออกจากเมือง', () => end('ครอบครัว', 'คุณพาลินข้ามสะพาน แม้จะไม่ได้เปิดโปงทุกคนที่เกี่ยวข้อง แต่พวกคุณยังมีโอกาสเริ่มต้นใหม่')],
      ['เปิดโปง Helix ต่อสาธารณะ', () => {
        if (Z.flags.evidence || Z.flags.expose) end('ความจริง', 'หลักฐานถูกส่งออกไปก่อนสะพานถูกปิด โลกภายนอกเริ่มรู้ว่าการระบาดถูกปกปิด แต่การเปิดโปงทำให้คุณกลายเป็นเป้าหมายของคนที่ยังมีอำนาจ');
        else end('หลักฐานสูญหาย', 'คุณพยายามเปิดโปง Helix แต่ไม่มีหลักฐานเพียงพอ ผู้คนรอดชีวิตบางส่วน ทว่าความจริงจมหายไปพร้อมเมือง');
      }],
      ['ช่วยคนที่ศูนย์พักพิงก่อน', () => {
        if (Z.trust.shelter >= 2) end('ผู้พิทักษ์', 'คุณกลับไปพาผู้รอดชีวิตจากศูนย์พักพิงขึ้นรถอพยพ คุณเสียโอกาสหนีเร็วที่สุด แต่คนอีกหลายสิบชีวิตรอด');
        else end('เสียสละ', 'คุณพยายามกลับไปช่วยศูนย์พักพิง แต่เวลาไม่พอ คุณช่วยบางคนได้และต้องอยู่กับการตัดสินใจนั้น');
      }]
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
    Z.hp = Math.max(0, Z.hp);
    log('บทสรุป: ' + title);
    show('จบเรื่อง: ' + title, body, [
      ['เริ่มเกมใหม่', () => { Z = initial(); render(); renderUI(); }],
      ['ปิดบทสรุป', () => {}]
    ]);
  }

  function gameOver(title, body) {
    Z.ending = { title, body };
    show(title, body, [
      ['โหลดเกมล่าสุด', load],
      ['เริ่มใหม่', () => { Z = initial(); render(); renderUI(); }]
    ]);
  }

  function initial() {
    return {
      x: 5.5, y: 6.5, hp: 100, sanity: 86, food: 2, ammo: 3, noise: 0, day: 1, minutes: 17,
      zone: 'เขตชานเมือง', inventory: ['ไฟฉาย', 'วิทยุพัง', 'มีดพก'],
      clues: ['ข้อความจากลินกล่าวถึงโรงพยาบาล'], flags: {}, quests: { main: 0, side: [] },
      trust: { lin: 0, mark: 0, shelter: 0 }, kills: 0, ending: null,
      feed: ['[21:17] คุณฟื้นขึ้นมาท่ามกลางเสียงไซเรนที่กำลังดับลง'],
      visited: [], zombies: [], steps: 0
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
    document.getElementById('noise').textContent = '🔉 เสียง: ' + (Z.noise > 3 ? 'สูง' : Z.noise > 0 ? 'ปานกลาง' : 'ต่ำ');
    document.getElementById('inventory').innerHTML = Z.inventory.map(i => `<span class="item">${esc(i)}</span>`).join('') || 'ว่าง';
    document.getElementById('clues').innerHTML = Z.clues.map(c => '• ' + esc(c)).join('<br>');
    document.getElementById('feed').textContent = Z.feed.join('\n');
    document.getElementById('status').textContent = Z.ending ? 'สถานะ: ' + Z.ending.title : 'สถานะ: ' + (Z.noise > 3 ? 'เสียงดัง เสี่ยงดึงดูดผู้ติดเชื้อ' : 'กำลังสำรวจ');
    
    let q = Z.quests.main;
    let names = ['เสียงจากชั้นใต้ดิน', 'สัญญาณที่ขาดหาย', 'ทางหนีที่ไม่มีคำตอบ', 'ตามรอยลิน', 'เลือกว่าจะช่วยใคร', 'รุ่งอรุณของคนที่เหลือ'];
    let texts = [
      'หาแบตเตอรี่ให้วิทยุฉุกเฉิน แล้วตัดสินใจว่าจะตามหาน้องสาวหรือไปยังจุดอพยพ',
      'เลือกเส้นทาง: ศูนย์พักพิง สถานีตำรวจ หรือโรงพยาบาล',
      'คุณเลือกออกจากเมืองก่อนรู้ความจริง',
      'ตามรอยลินไปยังโรงพยาบาลและห้องทดลอง Helix',
      'หลักฐานอยู่ในมือคุณแล้ว ถึงเวลาตัดสินใจว่าใครควรได้รับการช่วยเหลือ',
      'มุ่งหน้าสู่สะพานก่อนรุ่งเช้า'
    ];
    document.getElementById('questName').textContent = names[Math.min(q, names.length - 1)];
    document.getElementById('questText').textContent = texts[Math.min(q, texts.length - 1)];
    document.getElementById('people').innerHTML = `ลิน — น้องสาว (${Z.flags.saveLin ? 'อยู่กับคุณ' : Z.flags.hospital ? 'ถูกย้ายไป Helix' : 'ไม่ทราบตำแหน่ง'})<br>มาร์ค — เจ้าหน้าที่รักษาความปลอดภัย (${Z.flags.keycard ? 'พบหลักฐานในสถานีตำรวจ' : 'ยังไม่พบ'})`;
  }

  function esc(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function render() {
    ctx.clearRect(0, 0, 800, 500);
    let camX = Z.x * TILE - 400, camY = Z.y * TILE - 250;
    
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        let sx = x * TILE - camX, sy = y * TILE - camY;
        if (sx < -TILE || sy < -TILE || sx > 800 || sy > 500) continue;
        let t = map[y][x];
        ctx.fillStyle = t === 1 ? '#263129' : t === 2 ? '#3c4339' : t === 3 ? '#242c26' : '#303c31';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.strokeStyle = '#465244';
        ctx.globalAlpha = .25;
        ctx.strokeRect(sx, sy, TILE, TILE);
        ctx.globalAlpha = 1;
        if (t === 1) {
          ctx.fillStyle = '#151d18'; ctx.fillRect(sx + 4, sy + 4, 32, 32);
          ctx.fillStyle = '#49564a'; ctx.fillRect(sx + 7, sy + 8, 26, 4);
        }
        if (t === 3) {
          ctx.fillStyle = '#53634f'; ctx.beginPath(); ctx.arc(sx + 20, sy + 19, 13, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#26362a'; ctx.fillRect(sx + 17, sy + 23, 6, 15);
        }
      }
    }

    places.forEach(p => {
      let sx = p.x * TILE - camX, sy = p.y * TILE - camY;
      if (sx < -40 || sy < -40 || sx > 840 || sy > 540) return;
      ctx.fillStyle = Z.visited.includes(p.id) ? '#9cae8c' : '#d4b36a';
      ctx.beginPath(); ctx.arc(sx + 20, sy + 20, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#101711'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.id === 'hospital' ? 'H' : p.id === 'police' ? 'P' : p.id === 'shelter' ? 'S' : p.id === 'bridge' ? 'B' : p.id === 'lab' ? 'L' : p.id === 'radio' ? 'R' : p.id === 'market' ? 'M' : p.id === 'subway' ? 'T' : '+', sx + 20, sy + 25);
      ctx.fillStyle = '#f1f2df'; ctx.font = '12px system-ui'; ctx.fillText(p.name, sx + 20, sy - 5);
    });

    Z.zombies.forEach(z => {
      let sx = z.x * TILE - camX, sy = z.y * TILE - camY;
      ctx.fillStyle = '#9e5c54'; ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f7c5a9'; ctx.fillRect(sx - 4, sy - 2, 2, 2); ctx.fillRect(sx + 3, sy - 2, 2, 2);
    });

    let px = Z.x * TILE - camX, py = Z.y * TILE - camY;
    ctx.fillStyle = '#d8e5c7'; ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#486e4d'; ctx.fillRect(px - 5, py - 3, 10, 11);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py - 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#e9e7d4'; ctx.font = '12px system-ui'; ctx.fillText('คุณ', px + 14, py - 10);

    let p = nearPlace();
    if (p) {
      ctx.strokeStyle = '#e7c875'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x * TILE - camX + 20, p.y * TILE - camY + 20, 18, 0, Math.PI * 2); ctx.stroke();
    }
    renderUI();
  }

  function save() {
    try {
      localStorage.setItem('lastlight_save', JSON.stringify(Z));
      show('บันทึกแล้ว', 'บันทึกความคืบหน้าไว้ในเบราว์เซอร์นี้แล้ว');
    } catch (e) {
      show('บันทึกไม่ได้', 'เบราว์เซอร์ไม่อนุญาตพื้นที่จัดเก็บ');
    }
  }

  function load() {
    try {
      let s = localStorage.getItem('lastlight_save');
      if (!s) { show('ไม่มีเซฟ', 'ยังไม่พบบันทึกเกม'); return; }
      Z = JSON.parse(s); render(); show('โหลดสำเร็จ', 'กลับไปยังความคืบหน้าที่บันทึกไว้แล้ว');
    } catch (e) {
      show('โหลดไม่สำเร็จ', 'ข้อมูลบันทึกไม่ถูกต้อง');
    }
  }

  document.getElementById('saveTop').onclick = save;
  document.getElementById('loadBtn').onclick = load;
  document.getElementById('restart').onclick = () => { if (confirm('เริ่มเกมใหม่หรือไม่?')) { Z = initial(); render(); } };
  document.getElementById('interact').onclick = interact;
  document.getElementById('attack').onclick = attack;
  document.getElementById('sneak').onclick = sneak;
  document.getElementById('mapBtn').onclick = () => show('แผนที่เมืองอรุณเวสต์', places.map(p => `${Z.visited.includes(p.id) ? '✓' : '○'} ${p.name} — ${p.desc}`).join('\n'), [['กลับไปสำรวจ', () => {}]]);
  document.getElementById('useFood').onclick = () => {
    if (Z.food > 0) {
      Z.food--; Z.hp = Math.min(100, Z.hp + 12); Z.sanity = Math.min(100, Z.sanity + 3);
      timePass(5); log('คุณกินอาหาร ฟื้นพลังและตั้งสติ'); render();
    } else show('ไม่มีอาหาร', 'ค้นหาตลาดหรือศูนย์พักพิง');
  };
  document.getElementById('dlgClose').onclick = close;

  window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key) && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      if (e.key === ' ') { e.preventDefault(); interact(); return; }
      e.preventDefault();
      const k = e.key.toLowerCase();
      move(k === 'arrowleft' || k === 'a' ? -1 : k === 'arrowright' || k === 'd' ? 1 : 0, k === 'arrowup' || k === 'w' ? -1 : k === 'arrowdown' || k === 's' ? 1 : 0);
    }
    if (e.key.toLowerCase() === 'e') interact();
    if (e.key.toLowerCase() === 'f') attack();
  });

  document.querySelectorAll('[data-move]').forEach(b => {
    let [dx, dy] = b.dataset.move.split(',').map(Number);
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); move(dx, dy);
      moveHold = setInterval(() => move(dx, dy), 150);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { clearInterval(moveHold); moveHold = null; }));
  });

  Z.zombies = [{ x: 8.5, y: 6.5, hp: 2 }, { x: 16.5, y: 9.5, hp: 2 }, { x: 23.5, y: 14.5, hp: 2 }, { x: 29.5, y: 20.5, hp: 2 }];
  render();
})();
