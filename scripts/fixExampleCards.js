// Fix example cards: rename to match skeleton nodes, create new ones where needed
const fs = require('fs');
const path = require('path');

const BASE = 'E:/模块化学习/v2-系统/卡片';
const PRESET_BASE = 'E:/模块化学习/med-learn-mobile/src/assets/presetData/卡片';
const today = '2026-05-24';

// Map: [old card relative path] or null for new cards
// Target: first basic-layer non-speed-anchor node from each skeleton
const fixups = {
  // 呼吸系统: keep card but rename to match "气道解剖" skeleton node
  '呼吸系统/气道解剖.md': {
    title: '气道解剖',
    birthplace: '气道解剖',
    summary: '上气道（鼻→咽→喉）负责加温加湿过滤；下气道（气管→各级支气管→终末细支气管）是传导区。气管在T4-5分叉为左右主支气管，右主支气管更陡直→异物易入右侧。临床意义：气管插管过深→易入右侧→右肺通气+左肺萎陷。环状软骨是婴儿气道最窄处（成人是声门）。',
    layer: '基础',
    course: '系统解剖学',
    q3: '- [[]] — 肺叶与肺段解剖（气道树的终末分布）',
    q4: '- [[]] — 气管插管/支气管镜/气道异物',
    q5: '- [[]] — 食管解剖（气管后方→气管食管瘘=先天异常）',
    q6sym: '气道阻塞（异物/肿瘤/分泌物）→呼吸困难+喘鸣→Heimlich手法/支气管镜', q6sign: '', q6exam: '支气管镜+CT气道重建', q6treat: '',
  },
  // 消化系统: rename from 肝硬化 to match "消化道大体解剖"
  '消化系统/消化道大体解剖.md': {
    title: '消化道大体解剖',
    birthplace: '消化道大体解剖',
    summary: '消化道=口→咽→食管→胃→小肠（十二指肠+空肠+回肠）→大肠（盲肠+结肠+直肠）→肛管。全长约9m（尸僵后约5m）。前肠（腹腔动脉供血→食管下段至十二指肠降部大乳头）、中肠（SMA供血→十二指肠降部大乳头至横结肠近2/3）、后肠（IMA供血→横结肠远1/3至直肠上部）。腹膜内位vs腹膜间位vs腹膜后位决定器官的活动度和手术入路。',
    layer: '基础',
    course: '系统解剖学',
    q3: '- [[]] — 腹膜解剖（腹膜内位/间位/后位器官→决定手术入路和病理扩散途径）',
    q4: '- [[]] — 消化道血供（前/中/后肠→缺血性肠病的分区定位）',
    q5: '- [[]] — 腹部分区（9分法/4分法→腹痛定位的解剖基础）',
    q6sym: '腹痛定位（上腹/脐周/下腹+左/中/右→对应前中后肠分区）', q6sign: '腹膜刺激征（压痛/反跳痛/肌紧张）→壁层腹膜受刺激', q6exam: 'CT腹部+内镜（胃镜/结肠镜→直接观察黏膜）', q6treat: '',
  },
  // 泌尿系统: rename to match "肾小球滤过"
  '泌尿系统/肾小球滤过.md': {
    title: '肾小球滤过',
    birthplace: '肾小球滤过',
    summary: 'GFR=125mL/min≈180L/day——肾小球毛细血管血压（+55mmHg）推动滤过，受血浆胶渗压（-30mmHg）和Bowman囊静水压（-15mmHg）对抗，净滤过压≈10mmHg。滤过膜三层（内皮窗孔+GBM+足细胞裂孔隔膜）→只允许<70kDa的中性分子通过。Cr清除率≈GFR（滤过后几乎不被重吸收）→临床上eGFR=CKD分期核心指标。',
    layer: '基础',
    course: '生理学',
    q3: '- [[]] — 肾脏大体解剖+组织学（肾单位结构→滤过膜三层）',
    q4: '- Cr/BUN→eGFR→CKD分期 | AKI→GFR↓',
    q5: '- [[]] — 肝清除率（首过消除）vs 肾清除率',
    q6sym: '', q6sign: '水肿（GFR↓→水钠潴留→CKD/肾病综合征）', q6exam: 'eGFR(CKD-EPI)+Cr+BUN+Cystatin C+24h尿肌酐清除率', q6treat: '',
  },
  // 内分泌系统: create new card matching "下丘脑-垂体轴"
  '内分泌系统/下丘脑-垂体轴.md': {
    title: '下丘脑-垂体轴',
    birthplace: '下丘脑-垂体轴',
    summary: '下丘脑分泌释放/抑制激素（GHRH/GHIH/TRH/CRH/GnRH/多巴胺=PRL抑制因子）→垂体门脉系统→腺垂体。腺垂体分泌GH/TSH/ACTH/FSH/LH/PRL。神经垂体储存下丘脑合成的ADH+催产素。负反馈调节是核心原则：外周激素↓→下丘脑释放激素↑→垂体促激素↑→靶腺激素↑→负反馈抑制。三个轴（甲状腺轴/肾上腺轴/性腺轴）均遵循此逻辑。',
    layer: '基础',
    course: '生理学',
    q3: '- [[]] — 内分泌系统总论（激素分类：肽类/类固醇/胺类→受体位置决定了激素的作用速度和持续时间）',
    q4: '- [[]] — 甲状腺轴（TRH→TSH→T3/T4→负反馈） | [[]] — 肾上腺轴（CRH→ACTH→皮质醇→负反馈） | [[]] — 性腺轴（GnRH→FSH/LH→E₂/T→负反馈）',
    q5: '- [[]] — 自主神经系统（交感/副交感→肾上腺髓质E/NE→神经内分泌的桥梁）',
    q6sym: '', q6sign: '垂体腺瘤→双颞侧偏盲（压迫视交叉）+内分泌异常', q6exam: 'MRI垂体（平扫+增强）+激素全套（PRL/GH/IGF-1/ACTH/皮质醇/TSH/T3T4/LH/FSH/E₂/T）', q6treat: '',
  },
  // 神经系统: create new card matching "中枢神经系统解剖（脑）"
  '神经系统/中枢神经系统解剖（脑）.md': {
    title: '中枢神经系统解剖（脑）',
    birthplace: '中枢神经系统解剖（脑）',
    summary: '大脑分五叶（额=运动+语言+执行/顶=感觉+空间/颞=听觉+记忆+情感/枕=视觉/岛叶=内感受+情感）。间脑（丘脑=感觉中继站+下丘脑=自主神经+内分泌调控）。脑干（中脑+脑桥+延髓→10对颅神经核+传导束+生命中枢+网状结构=觉醒）。小脑（协调运动+平衡+肌张力→小脑损伤=同侧体征）。大脑由ACA+MCA+PCA供血，Willis环提供侧支。',
    layer: '基础',
    course: '系统解剖学',
    q3: '- [[]] — 神经组织学（神经元+胶质细胞+突触+髓鞘+血脑屏障）',
    q4: '- [[]] — 脑卒中（MCA=偏瘫/失语；ACA=下肢瘫；PCA=视野缺损） | [[]] — 意识障碍（脑干网状结构/双侧皮层→意识的双组分）',
    q5: '- [[]] — 脊髓解剖（传导束→感觉上行/运动下行→脊髓病变=传导束型感觉障碍→平面）',
    q6sym: '头痛+局灶神经功能缺损（偏瘫/失语/视野缺损）→卒中定位→CT/MRI', q6sign: 'FAST（面瘫+单侧无力+言语含糊→立即120）', q6exam: 'CT平扫（首先排除出血）→MRI DWI（金标准→梗死几分钟内显示）', q6treat: '',
  },
  // 血液系统: rename to match "造血"
  '血液系统/造血.md': {
    title: '造血',
    birthplace: '造血',
    summary: '造血=HSC（造血干细胞）→各种血细胞的过程。出生后主要在红骨髓（椎骨/胸骨/肋骨/骨盆/股骨近端）。HSC→多能祖细胞→淋系/髓系→各系前体细胞→成熟血细胞。调控因子：EPO（RBC→肾产生→低氧→HIF-1→EPO↑）、TPO（Plt→肝产生）、G-CSF/GM-CSF（中性粒/单核）、IL-3/SCF（早期）。HSC→自我更新（维持池）+分化（产生血细胞）的平衡。全血细胞减少→再障/MDS/白血病/巨幼贫=骨髓衰竭。',
    layer: '基础',
    course: '组织学与胚胎学',
    q3: '- [[]] — 骨的结构与功能（红骨髓位置→造血场所→骨质疏松/骨转移→骨髓被替代→全血↓）',
    q4: '- [[]] — 贫血分类（造血↓=再障/MDS/巨幼贫/缺铁/地贫/慢性病） | [[]] — 白血病（HSC克隆性增殖→正常造血受抑→全血↓+异常细胞↑）',
    q5: '- [[]] — 淋巴造血（淋系→B/T/NK→淋巴瘤/淋巴细胞白血病 vs 髓系→AML/CML/MDS）',
    q6sym: '', q6sign: '贫血貌（苍白/乏力/心悸）+出血（Plt↓）+感染（中性粒↓）=骨髓衰竭三联征', q6exam: '血常规+网织红（区分生成↓还是破坏↑）+骨髓穿刺活检（Cellularity+各系比例+原始细胞%+铁染色+细胞遗传学+分子）', q6treat: '',
  },
  // 免疫系统: rename to match "免疫器官与组织"
  '免疫系统/免疫器官与组织.md': {
    title: '免疫器官与组织',
    birthplace: '免疫器官与组织',
    summary: '中枢免疫器官：骨髓（B细胞发育+所有血细胞来源）+胸腺（T细胞发育→阳性选择=MHC限制性+阴性选择=自身耐受→中枢耐受→95%凋亡）。外周免疫器官：淋巴结（被膜下窦→皮层B→副皮质区T→髓质浆细胞+巨噬细胞→抗原呈递发生地）、脾（白髓T细胞区+边缘区+B细胞滤泡→血液中抗原应答；红髓→过滤衰老RBC）、MALT（黏膜相关→GALT/BALT/NALT→IgA分泌→黏膜防御前沿）。',
    layer: '基础',
    course: '组织学与胚胎学/医学免疫学',
    q3: '- [[]] — 免疫细胞（T/B/NK/DC/Mφ/中性粒/嗜酸粒/肥大细胞→各自功能+表面标志→流式免疫分型的基础）',
    q4: '- [[]] — 固有免疫+适应性免疫（抗原呈递→DC→淋巴结→T/B激活→生发中心→抗体+CTL）',
    q5: '- [[]] — 淋巴瘤分类（淋巴结活检→结构破坏+克隆性增生。霍奇金=R-S细胞；非霍奇金=B/T克隆性）',
    q6sym: '', q6sign: '淋巴结肿大（局部=感染/转移癌；全身=感染/自身免疫/淋巴瘤/白血病→无痛性进行性+固定融合=恶性肿瘤→活检！）', q6exam: '淋巴结活检（切除活检>穿刺→结构+免疫组化+流式+分子/基因重排） | 外周血免疫分型（流式→T/B/NK亚群计数→免疫缺陷/白血病/淋巴瘤）', q6treat: '',
  },
  // 运动系统: create new card matching "骨骼系统总览"
  '运动系统/骨骼系统总览.md': {
    title: '骨骼系统总览',
    birthplace: '骨骼系统总览',
    summary: '人体206块骨→中轴骨（颅骨+脊柱+胸骨+肋骨=80块）+附肢骨（上肢64+下肢62=126块）。骨按形态分：长骨（股骨/肱骨→骨干+骨骺+干骺端=纵向生长部位）、短骨（腕骨/跗骨）、扁骨（颅骨/肋骨/肩胛骨→保护+肌肉附着+造血）、不规则骨（椎骨/髋骨）。骨的功能：支撑+保护+运动（杠杆）+造血（红骨髓）+矿物质储存（Ca²⁺/P→随时可调用）。骨膜（外层纤维+内层生发层→成骨前体细胞→骨折愈合关键）。',
    layer: '基础',
    course: '系统解剖学',
    q3: '- [[]] — 骨组织学（编织骨vs板层骨；成骨细胞/破骨细胞/骨细胞→骨重塑单位→RANKL/RANK/OPG调控）',
    q4: '- [[]] — 骨折愈合过程（血肿→软骨痂→硬骨痂→重塑→爬行替代） | [[]] — 骨质疏松（破骨>成骨→骨量↓→椎体/髋部/腕部骨折→DEXA T-score诊断）',
    q5: '- [[]] — 关节分类与结构（纤维/软骨/滑膜关节→不同运动自由度→关节炎/脱位/韧带损伤的基础）',
    q6sym: '骨痛（夜间痛=恶性！持续性+局部叩痛→X线/MRI→排除病理骨折/感染/肿瘤）', q6sign: '畸形（骨折/先天/代谢性骨病）+局部压痛+反常活动+骨擦音/感=骨折体征', q6exam: 'X线（一线→骨折/关节炎/骨肿瘤）→CT（复杂骨折+脊柱）→MRI（骨髓+软组织→感染/肿瘤/早期骨坏死）→骨扫描（转移筛查）→DEXA（骨质疏松诊断）', q6treat: '',
  },
  // 生殖系统: rename to match skeleton node
  '生殖系统/女性生殖生理（月经周期）.md': null, // This card already exists with good content, just need to rename it
};

// First: delete old card files that don't match skeleton nodes
const oldCardsToDelete = [
  '呼吸系统/肺通气与换气.md',
  '消化系统/肝硬化.md',
  '泌尿系统/肾小球滤过率与清除率.md',
  '内分泌系统/2型糖尿病.md',
  '神经系统/缺血性脑卒中.md',
  '血液系统/缺铁性贫血.md',
  '免疫系统/Ⅰ型超敏反应.md',
  '运动系统/骨折愈合过程.md',
  '生殖系统/月经周期.md',
];

for (const oldCard of oldCardsToDelete) {
  for (const base of [BASE, PRESET_BASE]) {
    const p = path.join(base, oldCard);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      console.log('Deleted:', p);
    }
  }
}

// For 生殖系统, rename 月经周期.md → 女性生殖生理（月经周期）.md
const renameMap = {
  '生殖系统/月经周期.md': '生殖系统/女性生殖生理（月经周期）.md',
};

for (const [oldName, newName] of Object.entries(renameMap)) {
  for (const base of [BASE, PRESET_BASE]) {
    const oldP = path.join(base, oldName);
    const newP = path.join(base, newName);
    if (fs.existsSync(oldP)) {
      const content = fs.readFileSync(oldP, 'utf8');
      // Update title and birthplace in the content
      const updated = content
        .replace(/^# .+$/m, '# 女性生殖生理（月经周期）')
        .replace(/^birthplace: .+$/m, 'birthplace: 女性生殖生理（月经周期）');
      fs.writeFileSync(newP, updated, 'utf8');
      fs.unlinkSync(oldP);
      console.log('Renamed:', oldP, '→', newP);
    }
  }
}

// Now create the new cards
for (const [relativePath, card] of Object.entries(fixups)) {
  if (!card) continue; // null = already handled by rename

  const content = `---
birthplace: ${card.birthplace}
system: ${relativePath.split('/')[0]}
layer: ${card.layer}
projections: []
filled: ${today}
---

# ${card.title}

## 1. 一句话

${card.summary}

## 2. 定位

系统：${relativePath.split('/')[0]}　　层：${card.layer === '基础' ? '🟢' : card.layer === '临床' ? '🔴' : '🟡'} ${card.layer}
课程：${card.course}

## 3. 踩在什么上面（纵向向下）

${card.q3}

## 4. 通向哪里（纵向向上）

${card.q4}

## 5. 还有哪里类似（横向类比）

${card.q5}

## 6. 如果现在是医生（临床反向）

- 症状：${card.q6sym || '(自行填写)'}
- 体征：${card.q6sign || '(自行填写)'}
- 检查：${card.q6exam || '(自行填写)'}
- 治疗：${card.q6treat || '(自行填写)'}
`;

  for (const base of [BASE, PRESET_BASE]) {
    const p = path.join(base, relativePath);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, 'utf-8');
  }
  console.log('Created:', relativePath);
}

console.log('\nDone! Created/replaced example cards matching skeleton nodes.');
