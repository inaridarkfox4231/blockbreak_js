// STGもどきの前段階としてブロック崩しに挑戦します。サイズは480x400でpythonからの移植。
// ステージを構成するjsonは別ルートで構成する流れ・・うまくいくか知らんけど

// State一覧
// Title, Play, Pause, Gameover, Clearで全部

let mySystem;

// ----------------------------------------------------------------------------------- //
// constant.

const CANVAS_W = 800;
const CANVAS_H = 600;
const GRIDSIZE = 20;

const STAGE_MAX = 19; // 最大ステージ数

// KEYCODE定数
const K_ENTER = 13;
const K_RIGHT = 39;
const K_LEFT = 37;
const K_UP = 38;
const K_DOWN = 40;
const K_SPACE = 32;

// ライフ
//const LIFES = [3, 5, 10, 15];
// ステータス
const STATUS = {speed:[4, 6, 7], attack:[1, 2, 3], rotationSpeed:[0.1, 0.15, 0.175]};
// パドル長
const PADDLE_LENGTH = [80, 60, 40, 30];
// ブロックヒュー
const BLOCK_HUE = [18, 10, 0, 78, 65];
// ブロックやボールが壊れるときの色パレット（黄色、オレンジ、赤、紫、青、ピンク、灰色、ライム、スカイブルー）
const BREAK_PALETTE = ["#fff000", "#ffa500", "#ff0000", "#800080", "#0000cd", "#ff1493", "#888", "lime", "#00FFFF"];
// モードテキスト
const MODE_TEXT = ["EASY", "NORMAL", "HARD", "CRAZY"];
const MODE_HUE = [40, 55, 70, 85]

// ブロックタイプ定数
// NORMAL:白、薄い青、濃い青（幅2の厚み、文字無し）、LIFEUP:ピンク（Lの文字）、WALL:灰色（幅5の厚み）
// 耐久は1,2,3,1,Infinityで2より大きい場合は1より大きいダメージしか受け付けない(3→1→x)
// if(tough>2 && damage<1){ nodamage. }else{ tough-=damage }
// if(type===NORMAL&&w==40&&h==40&&tough==0){ 分裂 } (2x2で1ダメージ受けた場合に限り4つの1x1にばらける仕様作りたい)
// playの方であれこれやれば出来ると思う。
const NORMAL = 0;
//const LIFEUP = 1;
const WALL = 2;

// particle関連
// 色に関してはパレットを使ってRGBでやってるっぽいので
// パーティクル専用のgr作ってそこに全部描いて乗せる方法で行くか
let particlePool;
const EMPTY_SLOT = Object.freeze(Object.create(null)); // ダミーオブジェクト

const PARTICLE_LIFE = 45; // 寿命
const PARTICLE_ROTATION_SPEED = 0.12; // 形状の回転スピード
const MIN_DISTANCE = 30; // 到達距離
const MAX_DISTANCE = 60;
const MIN_RADIUS = 6; // 大きさ
const MAX_RADIUS = 24;

let huiFont;

// ----------------------------------------------------------------------------------- //
// lavaShader.

const vsLava =
"precision mediump float;" +
"attribute vec3 aPosition;" +
"void main(void){" +
"  gl_Position = vec4(aPosition, 1.0);" +
"}";

const fsLava =
"precision mediump float;" +
"uniform vec2 u_resolution;" +
"uniform float u_time;" +
"const float pi = 3.14159;" +
"const vec2 r_vec_20 = vec2(127.1, 311.7);" +
"const vec2 r_vec_21 = vec2(269.5, 183.3);" +
"const vec2 u_10 = vec2(1.0, 0.0);" +
"const vec2 u_01 = vec2(0.0, 1.0);" +
"const vec2 u_11 = vec2(1.0, 1.0);" +
"const vec3 r_vec_30 = vec3(127.1, 311.7, 251.9);" +
"const vec3 r_vec_31 = vec3(269.5, 183.3, 314.3);" +
"const vec3 r_vec_32 = vec3(419.2, 371.9, 218.4);" +
"const vec3 u_100 = vec3(1.0, 0.0, 0.0);" +
"const vec3 u_010 = vec3(0.0, 1.0, 0.0);" +
"const vec3 u_001 = vec3(0.0, 0.0, 1.0);" +
"const vec3 u_110 = vec3(1.0, 1.0, 0.0);" +
"const vec3 u_101 = vec3(1.0, 0.0, 1.0);" +
"const vec3 u_011 = vec3(0.0, 1.0, 1.0);" +
"const vec3 u_111 = vec3(1.0, 1.0, 1.0);" +
"const float r_coeff = 43758.5453123;" +
"const int octaves = 6;" +
// 2Dランダムベクトル(-1.0～1.0)
"vec2 random2(vec2 st){" +
"  vec2 v;" +
"  v.x = sin(dot(st, r_vec_20)) * r_coeff;" +
"  v.y = sin(dot(st, r_vec_21)) * r_coeff;" +
"  return -1.0 + 2.0 * fract(v);" +
"}" +
// 3Dランダムベクトル(-1.0～1.0)
"vec3 random3(vec3 st){" +
"  vec3 v;" +
"  v.x = sin(dot(st, r_vec_30)) * r_coeff;" +
"  v.y = sin(dot(st, r_vec_31)) * r_coeff;" +
"  v.z = sin(dot(st, r_vec_32)) * r_coeff;" +
"  return -1.0 + 2.0 * fract(v);" + // -1.0～1.0に正規化
"}" +
"float snoise3(vec3 st){" +
"  vec3 p = st + (st.x + st.y + st.z) / 3.0;" +
"  vec3 f = fract(p);" +
"  vec3 i = floor(p);" +
"  vec3 g0, g1, g2, g3;" +
"  vec4 wt;" +
"  g0 = i;" +
"  g3 = i + u_111;" +
"  if(f.x >= f.y && f.x >= f.z){" +
"    g1 = i + u_100;" +
"    g2 = i + (f.y >= f.z ? u_110 : u_101);" +
"    wt = (f.y >= f.z ? vec4(1.0 - f.x, f.x - f.y, f.y - f.z, f.z) : vec4(1.0 - f.x, f.x - f.z, f.z - f.y, f.y));" +
"  }else if(f.y >= f.x && f.y >= f.z){" +
"    g1 = i + u_010;" +
"    g2 = i + (f.x >= f.z ? u_110 : u_011);" +
"    wt = (f.x >= f.z ? vec4(1.0 - f.y, f.y - f.x, f.x - f.z, f.z) : vec4(1.0 - f.y, f.y - f.z, f.z - f.x, f.x));" +
"  }else{" +
"    g1 = i + u_001;" +
"    g2 = i + (f.x >= f.y ? u_101 : u_011);" +
"    wt = (f.x >= f.y ? vec4(1.0 - f.z, f.z - f.x, f.x - f.y, f.y) : vec4(1.0 - f.z, f.z - f.y, f.y - f.x, f.x));" +
"  }" +
"  float value = 0.0;" +
"  wt = wt * wt * wt * (wt * (wt * 6.0 - 15.0) + 10.0);" +
"  value += wt.x * dot(p - g0, random3(g0));" +
"  value += wt.y * dot(p - g1, random3(g1));" +
"  value += wt.z * dot(p - g2, random3(g2));" +
"  value += wt.w * dot(p - g3, random3(g3));" +
"  return value;" +
"}" +
// fbm
"float fbm(vec3 st){" +
"  float value = 0.0;" +
"  float amplitude = 0.5;" +
"  for(int i = 0; i < octaves; i++){" +
"    value += amplitude * snoise3(st);" +
"    st *= 2.0;" +
"    amplitude *= 0.5;" +
"  }" +
"  return value;" +
"}" +
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 getHSB(float r, float g, float b){" +
"    vec3 c = vec3(r, g, b);" +
"    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"    rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"    return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
"void main(void){" +
"  vec2 st = gl_FragCoord.xy * 0.5 / min(u_resolution.x, u_resolution.y);" +
"  vec2 p = (st + vec2(0.1, 0.18) * u_time) * 3.0;" +
"  float n = 0.5 + 0.5 * fbm(vec3(p, u_time * 0.2));" + // ノイズ計算
"  vec3 fireColor = getHSB((n - 0.46) * 0.78, 1.0, 1.0);" +
"  vec3 skyColor = getHSB(0.02, 1.0, 0.5);" +
"  vec3 finalColor = skyColor + (fireColor - skyColor) * smoothstep(0.44, 0.56, n);" +
"  gl_FragColor = vec4(finalColor, 1.0);" +
"}";

// ----------------------------------------------------------------------------------- //
// titleShader.

let vsTitle =
"precision mediump float;" +
"attribute vec3 aPosition;" +
"void main(void){" +
"  gl_Position = vec4(aPosition, 1.0);" +
"}";

let fsTitle =
"precision mediump float;" +
"uniform vec2 u_resolution;" +
"uniform vec2 u_seed;" +
"const float pi = 3.14159;" +
"const vec2 r_vector = vec2(12.9898, 78.233);" +
"const float r_coeff = 43758.5453123;" +
"const int octaves = 6;" +
// 茶色
"const vec3 brown = vec3(0.725, 0.479, 0.341);" +
// 2Dランダムベクトル(-1.0～1.0)
"vec2 random2(vec2 st){" +
"  vec2 v = vec2(0.0);" +
"  v.x = sin(dot(st, vec2(127.1, 311.7))) * r_coeff;" +
"  v.y = sin(dot(st, vec2(269.5, 183.3))) * r_coeff;" +
"  return -1.0 + 2.0 * fract(v);" + // -1.0～1.0に正規化
"}" +
// gradient noise. (-1.0～1.0)
// 各頂点からのベクトルを各頂点におけるベクトルに掛けて内積を作る。
"float dnoise(vec2 p){" +
"  vec2 i = floor(p);" +
"  vec2 f = fract(p);" +
"  vec2 u = f * f * (3.0 - 2.0 * f);" +
"  vec2 p_00 = vec2(0.0, 0.0);" +
"  vec2 p_01 = vec2(0.0, 1.0);" +
"  vec2 p_10 = vec2(1.0, 0.0);" +
"  vec2 p_11 = vec2(1.0, 1.0);" +
"  float value_00 = dot(random2(i + p_00), f - p_00);" +
"  float value_01 = dot(random2(i + p_01), f - p_01);" +
"  float value_10 = dot(random2(i + p_10), f - p_10);" +
"  float value_11 = dot(random2(i + p_11), f - p_11);" +
"  return mix(mix(value_00, value_10, u.x), mix(value_01, value_11, u.x), u.y);" +
"}" +
// fbmやってみる
"float fbm(vec2 st){" +
"  float value = 0.0;" +
"  float amplitude = 0.5;" +
"  for(int i = 0; i < octaves; i++){" +
"    value += amplitude * dnoise(st);" +
"    st *= 2.0;" +
"    amplitude *= 0.5;" +
"  }" +
"  return value;" +
"}" +
// fbm_ridge
"float fbm_ridge(vec2 st){" +
"  float value = 0.0;" +
"  float amplitude = 0.5;" +
"  for(int i = 0; i < octaves; i++){" +
"    value += abs(amplitude * dnoise(st));" +
"    st *= 2.0;" +
"    amplitude *= 0.5;" +
"  }" +
"  return value;" +
"}" +
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 getHSB(float r, float g, float b){" +
"    vec3 c = vec3(r, g, b);" +
"    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"    rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"    return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
"void main(void){" +
"  vec2 p = gl_FragCoord.xy * 0.5 / min(u_resolution.x, u_resolution.y);" +
// シードをレンガごとに変える、あとこれを使って最後にグリッドを引く。
"  vec2 q = p * 20.0 + vec2(0.3, 0.4);" +
"  if(fract(0.5 * q.y) > 0.5){ q.x += 1.0; }" +
"  vec2 st = p + u_seed + random2(vec2(floor(0.5 * q.x), floor(q.y))) * 5.0;" +
"  st *= 8.0;" + // 細かさ。大きいほど細かくなる。
// fbmにより-1.0～1.0の値を出してから0.0～1.0に正規化
"  float n = fbm(st) * 0.5 + 0.5;" +
"  n = n * n * (3.0 - 2.0 * n);" +
"  float sat = 1.0;" +
"  float bl = 1.0;" +
"  float hue = 0.55;" +
// skyColorは0.55～0.58のグラデーションで
"  vec3 baseColor = vec3(0.75);" +
// cloudColorは白・・
"  vec3 blockColor = brown;" +
// 最終的な色・・
"  vec3 col;" +
// nが0.4以下の所はskyColor, 0.6以上の所はcloudColorで、間の所は
// smoothstepでblendしてみる。
"  col = baseColor + (blockColor - baseColor) * smoothstep(0.42, 0.58, n);" +
"  vec4 finalColor = vec4(col, 1.0);" +
// グリッド
"  if(fract(0.5 * q.x) < 0.05 || fract(q.y) < 0.1){ finalColor = vec4(brown * 0.5, 1.0); }" +
"  gl_FragColor = finalColor;" +
"}";

// ----------------------------------------------------------------------------------- //
// playShader.
let vsPlay =
"precision mediump float;" +
"attribute vec3 aPosition;" +
"void main(void){" +
"  gl_Position = vec4(aPosition, 1.0);" +
"}";

let fsPlay =
"precision mediump float;" +
"uniform vec2 u_resolution;" +
"uniform float u_time;" +
"uniform float u_hue;" +
"const float pi = 3.14159;" +
"const vec2 r_vec_20 = vec2(127.1, 311.7);" +
"const vec2 r_vec_21 = vec2(269.5, 183.3);" +
"const vec2 u_10 = vec2(1.0, 0.0);" +
"const vec2 u_01 = vec2(0.0, 1.0);" +
"const vec2 u_11 = vec2(1.0, 1.0);" +
"const vec3 r_vec_30 = vec3(127.1, 311.7, 251.9);" +
"const vec3 r_vec_31 = vec3(269.5, 183.3, 314.3);" +
"const vec3 r_vec_32 = vec3(419.2, 371.9, 218.4);" +
"const vec3 u_100 = vec3(1.0, 0.0, 0.0);" +
"const vec3 u_010 = vec3(0.0, 1.0, 0.0);" +
"const vec3 u_001 = vec3(0.0, 0.0, 1.0);" +
"const vec3 u_110 = vec3(1.0, 1.0, 0.0);" +
"const vec3 u_101 = vec3(1.0, 0.0, 1.0);" +
"const vec3 u_011 = vec3(0.0, 1.0, 1.0);" +
"const vec3 u_111 = vec3(1.0, 1.0, 1.0);" +
"const float r_coeff = 43758.5453123;" +
"const int octaves = 6;" +
// 2Dランダムベクトル(-1.0～1.0)
"vec2 random2(vec2 st){" +
"  vec2 v;" +
"  v.x = sin(dot(st, r_vec_20)) * r_coeff;" +
"  v.y = sin(dot(st, r_vec_21)) * r_coeff;" +
"  return -1.0 + 2.0 * fract(v);" +
"}" +
// 3Dランダムベクトル(-1.0～1.0)
"vec3 random3(vec3 st){" +
"  vec3 v;" +
"  v.x = sin(dot(st, r_vec_30)) * r_coeff;" +
"  v.y = sin(dot(st, r_vec_31)) * r_coeff;" +
"  v.z = sin(dot(st, r_vec_32)) * r_coeff;" +
"  return -1.0 + 2.0 * fract(v);" + // -1.0～1.0に正規化
"}" +
"float snoise3(vec3 st){" +
"  vec3 p = st + (st.x + st.y + st.z) / 3.0;" +
"  vec3 f = fract(p);" +
"  vec3 i = floor(p);" +
"  vec3 g0, g1, g2, g3;" +
"  vec4 wt;" +
"  g0 = i;" +
"  g3 = i + u_111;" +
"  if(f.x >= f.y && f.x >= f.z){" +
"    g1 = i + u_100;" +
"    g2 = i + (f.y >= f.z ? u_110 : u_101);" +
"    wt = (f.y >= f.z ? vec4(1.0 - f.x, f.x - f.y, f.y - f.z, f.z) : vec4(1.0 - f.x, f.x - f.z, f.z - f.y, f.y));" +
"  }else if(f.y >= f.x && f.y >= f.z){" +
"    g1 = i + u_010;" +
"    g2 = i + (f.x >= f.z ? u_110 : u_011);" +
"    wt = (f.x >= f.z ? vec4(1.0 - f.y, f.y - f.x, f.x - f.z, f.z) : vec4(1.0 - f.y, f.y - f.z, f.z - f.x, f.x));" +
"  }else{" +
"    g1 = i + u_001;" +
"    g2 = i + (f.x >= f.y ? u_101 : u_011);" +
"    wt = (f.x >= f.y ? vec4(1.0 - f.z, f.z - f.x, f.x - f.y, f.y) : vec4(1.0 - f.z, f.z - f.y, f.y - f.x, f.x));" +
"  }" +
"  float value = 0.0;" +
"  wt = wt * wt * wt * (wt * (wt * 6.0 - 15.0) + 10.0);" +
"  value += wt.x * dot(p - g0, random3(g0));" +
"  value += wt.y * dot(p - g1, random3(g1));" +
"  value += wt.z * dot(p - g2, random3(g2));" +
"  value += wt.w * dot(p - g3, random3(g3));" +
"  return value;" +
"}" +
// fbm
"float fbm(vec3 st){" +
"  float value = 0.0;" +
"  float amplitude = 0.5;" +
"  for(int i = 0; i < octaves; i++){" +
"    value += amplitude * snoise3(st);" +
"    st *= 2.0;" +
"    amplitude *= 0.5;" +
"  }" +
"  return value;" +
"}" +
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 getHSB(float r, float g, float b){" +
"    vec3 c = vec3(r, g, b);" +
"    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"    rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"    return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
"void main(void){" +
"  vec2 st = gl_FragCoord.xy * 0.5 / min(u_resolution.x, u_resolution.y);" +
"  vec2 p = (st + vec2(0.05, 0.09) * u_time) * 3.0;" +
"  float n = 0.5 + 0.5 * fbm(vec3(p, u_time * 0.05));" + // ノイズ計算
"  vec3 cloudColor = vec3(1.0);" +
"  vec3 skyColor = getHSB(u_hue, sqrt(st.y * (2.0 - st.y)), 0.5);" +
"  vec3 finalColor = skyColor + (cloudColor - skyColor) * smoothstep(0.44, 0.56, n);" +
"  gl_FragColor = vec4(finalColor, 1.0);" +
"}";

// ----------------------------------------------------------------------------------- //
// sound関連.
let myMusic;
let codes = [];
let sound_death;
let sound_wall;
let sound_decision;
let sound_powerup;

// ----------------------------------------------------------------------------------- //
// main.

function preload(){
	huiFont = loadFont("https://inaridarkfox4231.github.io/assets/HuiFont29.ttf");
	const codeNames = ["C", "D", "E", "F", "G", "A", "B", "C2", "D2", "E2", "F2", "G2", "A2", "B2",
                     "C3", "D3", "E3", "F3", "G3", "A3", "B3"];
	for(let name of codeNames){
		codes.push(loadSound("https://inaridarkfox4231.github.io/blockbreakSounds/code_" + name + ".wav"));
	}
	sound_death = loadSound("https://inaridarkfox4231.github.io/blockbreakSounds/death.wav");
	sound_wall = loadSound("https://inaridarkfox4231.github.io/blockbreakSounds/wall.wav");
	sound_decision = loadSound("https://inaridarkfox4231.github.io/blockbreakSounds/decision.wav");
	sound_powerup = loadSound("https://inaridarkfox4231.github.io/blockbreakSounds/powerup.wav");
}

function setup() {
	createCanvas(CANVAS_W, CANVAS_H);
	particlePool = new ObjectPool(() => { return new Particle(); }, 512);
	mySystem = new System();
	myMusic = new Music();
}

function draw() {
	mySystem.update();
	mySystem.draw();
	mySystem.shift();
}

// ----------------------------------------------------------------------------------- //
// sounds.
// 今回は効果音オンリーなので。

class Music{
	constructor(){
		this.codeSounds = codes;
		this.deathSound = sound_death;
		this.wallSound = sound_wall;
		this.decisionSound = sound_decision;
		this.powerupSound = sound_powerup;
	}
	playBlockSound(id){
		this.codeSounds[id].play();
	}
	playDeathSound(){
		this.deathSound.play();
	}
	playWallSound(){
		this.wallSound.play();
	}
	playDecisionSound(){
		this.decisionSound.play();
	}
	playPowerupSound(){
		this.powerupSound.play();
	}
}

// ----------------------------------------------------------------------------------- //
// system.

// 遷移図作り直し（てかp5jsで描こうよ）
class System{
	constructor(){
		this.state = {title:new Title(this), play:new Play(this),
		              pause:new Pause(this), clear:new Clear(this)}; // ゲームオーバー廃止
		this.currentState = this.state.title;
	}
  getState(stateName){
    if(stateName === ""){ return undefined; }
    return this.state[stateName];
  }
  setState(nextState){
    this.currentState.setNextState(""); // nextを先に初期化
    nextState.prepare(this.currentState); // 遷移前の諸準備
    this.currentState = nextState; // 移行
  }
	update(){
		this.currentState.update();
	}
	draw(){
		this.currentState.draw();
	}
	shift(){
    let nextState = this.currentState.getNextState();
    if(nextState !== undefined){
      this.setState(nextState);
    }
	}
}

// ----------------------------------------------------------------------------------- //
// state.

class State{
	constructor(_node){
    this.node = _node;
    this.name = "";
		this.gr = createGraphics(CANVAS_W, CANVAS_H);
    this.nextState = undefined; // 次のstateが未定義でないときに遷移させる
	}
	drawPrepare(){} // 準備描画（最初に一回だけやる）
  getNextState(){ return this.nextState; }
  setNextState(stateName){
    this.nextState = this.node.getState(stateName);
  }
  prepare(_state){
    // 新しい状態に遷移するとき、前の状態の情報を元になんかする（なんかです）
    // たとえばselectからplayに行くときにmodeの情報を与えるとか
  }
  keyAction(code){} // キーイベント
	clickAction(){} // マウスクリックイベント
	update(){}
	draw(){}
}

// 要するにタイトルからプレイ行くの？
// ゲームに依るんじゃない・・まあいいけど。めんどくさいしな。クリックで行けた方が楽よね。
// 水色、青、紫で。
class Title extends State{
	constructor(_node){
		super(_node);
		this.name = "title";
		//this.level = 0;
		this.stage = 0; // レベル廃止
		this.mode = 0;
		this.stageSpace = createGraphics(700, 220);
		this.modeSpace = createGraphics(350, 40);
		this.playButton = createGraphics(120, 60);
		this.drawPrepare();
		this.bg = createGraphics(CANVAS_W, CANVAS_H, WEBGL); // 背景
		this.createBackground();
	}
	createBackground(){
		let bgShader = this.bg.createShader(vsTitle, fsTitle);
		this.bg.shader(bgShader);
		bgShader.setUniform("u_resolution", [CANVAS_W, CANVAS_H]);
		bgShader.setUniform("seed", [Math.random() * 99, Math.random() * 99]);
		this.bg.quad(-1, -1, -1, 1, 1, 1, 1, -1);
	}
	drawNonActiveButton(gr, x, y, w, h, txt){
		gr.fill(50);
		gr.triangle(x, y, x + w, y, x, y + h);
		gr.fill(25);
		gr.triangle(x + w, y, x, y + h, x + w, y + h);
		gr.fill(75);
		gr.rect(x + w * 0.1, y + h * 0.1, w * 0.8, h * 0.8);
		gr.fill(0);
		gr.text(txt, x + w * 0.5, y + h * 0.5);
	}
	drawActiveButton(gr, x, y, w, h, txt, hue){
		gr.fill(hue, 50, 100);
		gr.triangle(x, y, x + w, y, x, y + h);
		gr.fill(hue, 100, 50);
		gr.triangle(x + w, y, x, y + h, x + w, y + h);
		gr.fill(hue, 100, 100);
		gr.rect(x + w * 0.1, y + h * 0.1, w * 0.8, h * 0.8);
		gr.fill(0);
		gr.text(txt, x + w * 0.5, y + h * 0.5);
	}
  drawPrepare(){
		this.gr.textFont(huiFont);
		this.gr.textAlign(CENTER, CENTER);
		this.gr.fill(0);
    ordinaryPrepare([this.stageSpace, this.modeSpace, this.playButton]);
		this.drawStageButtons();
		this.drawModeButtons();
		this.drawPlayButton();
	}
	drawStageButtons(){
		this.stageSpace.clear();
		for(let z = 0; z < 3; z++){
		  for(let x = 0; x < 5; x++){
			  for(let y = 0; y < 5; y++){
					let n = x + y * 5 + z * 25;
				  if(this.stage === n){
					  this.drawActiveButton(this.stageSpace, 45 * x + 240 * z, 45 * y, 40, 40, n, 20 + z * 15);
				  }else{
				  	this.drawNonActiveButton(this.stageSpace, 45 * x + 240 * z, 45 * y, 40, 40, n);
				  }
			  }
		  }
	  }
	}
	drawModeButtons(){
		this.modeSpace.clear();
		for(let i = 0; i < 4; i++){
			if(i === this.mode){
				this.drawActiveButton(this.modeSpace, 90 * i, 0, 80, 40, MODE_TEXT[i], MODE_HUE[i]);
			}else{
				this.drawNonActiveButton(this.modeSpace, 90 * i, 0, 80, 40, MODE_TEXT[i]);
			}
		}
	}
	drawPlayButton(){
		this.playButton.textSize(48);
		this.playButton.fill(0, 50, 100);
		this.playButton.triangle(0, 0, 120, 0, 0, 60);
		this.playButton.fill(0, 100, 50);
		this.playButton.triangle(120, 0, 0, 60, 120, 60);
		this.playButton.fill(0, 100, 100);
		this.playButton.rect(12, 6, 96, 48);
		this.playButton.fill(255);
		this.playButton.text("play", 60 + 2, 24 + 2);
		this.playButton.fill(0);
		this.playButton.text("play", 60, 24);
	}
	prepare(_state){
		// いろいろリセットしないとダメ
		// this.level = 0;
		this.stage = 0;
		this.mode = 0;
		this.drawStageButtons();
		this.drawModeButtons();
	}
  keyAction(code){
    // エンターキー押したら直接プレイへ飛ぶ
    if(code === K_ENTER){
      this.setNextState("play");
    }
	}
	clickAction(){
		// クリック位置によってレベル変更、モード変更、プレイ、の3種類の可能性。
		// レベルボタンの位置：(220, 310, 400, 490, 580)x(300, 300, 300, 300, 300)の80x40です。
		// モードボタンの位置：(260, 350, 440, 530)x(400, 400, 400, 400)の80x40.
		// プレイボタンの位置：340x505の120x60です。
		const mx = mouseX;
		const my = mouseY;
		if(mx > 50 && mx < 750 && my > 210 && my < 430){
			if((my - 210) % 45 > 40){ return; }
			if((mx - 50) % 240 > 220){ return; }
			if(((mx - 50) % 240) % 45 > 40){ return; }
			const z = Math.floor((mx - 50) / 240);
			const x = Math.floor(((mx - 50) % 240) / 45);
			const y = Math.floor((my - 210) / 45);
			const newStage = x + y * 5 + z * 25;
			if(newStage > STAGE_MAX){ return; }
			if(newStage !== this.stage){
				this.stage = newStage;
				myMusic.playDecisionSound();
			}
			this.drawStageButtons();
		}
		if(mx > 225 && mx < 575 && my > 450 && my < 490){
			if((mx - 225) % 90 > 80){ return; }
			const newMode = Math.floor((mx - 225) / 90);
			if(newMode !== this.mode){
				this.mode = newMode;
				myMusic.playDecisionSound();
			}
			this.drawModeButtons();
		}
		if(mx > 340 && mx < 460 && my > 510 && my < 570){
			this.setNextState("play");
			myMusic.playDecisionSound();
		}
	}
	update(){}
	draw(){
		this.gr.image(this.bg, 0, 0);
		this.gr.fill(255);
		this.gr.textSize(90);
		this.gr.text("BLOCKBREAK", 400 + 2, 60 + 2);
		this.gr.textSize(45);
		this.gr.text("----CLICK PLAY BUTTON----", 402, 162);
		this.gr.fill(0);
		this.gr.textSize(90);
		this.gr.text("BLOCKBREAK", 400, 60);
		this.gr.textSize(45);
		this.gr.text("----CLICK PLAY BUTTON----", 400, 160);
		this.gr.image(this.stageSpace, 400 - 350, 210);
		this.gr.image(this.modeSpace, 400 - 175, 450);
		this.gr.image(this.playButton, 400 - 60, 510);
		image(this.gr, 0, 0);
	}
}

// まあ今回はそんな感じで
function ordinaryPrepare(graphics){
	for(let gr of graphics){
		gr.textAlign(CENTER, CENTER);
		gr.textSize(24);
		gr.textFont(huiFont);
		gr.colorMode(HSB, 100);
		gr.noStroke();
	}
}

// Play以降を作り直す。

// まず、levelとmodeを受け取らないと始まらないので。あとstageが増えていく、これはクリアに移行する前に増やす、
// クリアに情報持たせるのは無駄、同じ理由でポーズやゲームオーバーにその情報を持たせることもしない・・あ、
// クリアにステージ番号だけは持たせる。5だったらオールクリア。
// offsetね
// ああ、pauseから来る場合は何もしないのよ・・忘れてた。
class Play extends State{
	constructor(_node){
		super(_node);
		this.name = "play";
		this.gameSystem = new GameSystem();
		//this.level = 0;
		this.stage = 0;
		this.offSet = {}; // ゲームシステム側のグラフィックを表示する際のオフセット
		this.preAnimationSpan = 60;
		this.drawPrepare();
		this.bg = createGraphics(CANVAS_W, CANVAS_H, WEBGL);
		this.bgShader = this.bg.createShader(vsPlay, fsPlay);
		this.bg.shader(this.bgShader);
	}
	drawPrepare(){
		this.gr.noStroke();
		this.gr.textSize(64);
		this.gr.textAlign(CENTER, CENTER);
		this.gr.textFont(huiFont);
	}
	bgPrepare(){
		this.bgShader.setUniform("u_resolution", [CANVAS_W, CANVAS_H]);
		this.bgShader.setUniform("u_time", Math.floor(Math.random() * 999));
		this.bgShader.setUniform("u_hue", Math.random()); // hueはもうランダムで
		this.bg.quad(-1, -1, -1, 1, 1, 1, 1, -1);
	}
  prepare(_state){
		switch(_state.name){
			case "pause":
			  return;
			case "title":
			  this.gameSystem.initialize(_state.mode); // 1を引くって感じで。mode（難易度）設定。
				this.stage = _state.stage;
				break;
		}
		this.bgPrepare();
		this.gameSystem.setPattern(this.stage); // レベルとステージは両方必要
		this.offSet = this.gameSystem.getOffSet(); // オフセットを計算する

		this.preAnimationSpan = 60; // 0になるまでいろいろキャンセルしてステージ番号を表示
  }
  keyAction(code){
		if(this.preAnimationSpan > 0){ return; } // プレアニメ中はポーズ禁止
		// シフトキーでボールの位置が変わるかも
		// スペースキーでポーズ
		if(code === K_SPACE){
			this.setNextState("pause");
		}
	}
	clickAction(){
		if(this.preAnimationSpan > 0){ return; } // プレアニメ中はクリック禁止
		this.gameSystem.clickAction();
	}
	update(){
		if(this.preAnimationSpan > 0){
			this.preAnimationSpan--;
			return;
		}

		this.gameSystem.update();

		// ゲームオーバーにするか否かの処理。trueを返したらゲームオーバーに移行する
		// それは廃止。復活処理。
		this.gameSystem.revival();
		//if(this.gameSystem.gameoverCheck()){
		//	this.setNextState("gameover");
		//}
		// クリアにする。true返したら、ステージ番号増やす。5になったらplayに戻さずにタイトルへ。
		if(this.gameSystem.clearCheck()){
			this.stage++;
			if(this.stage > STAGE_MAX){ this.stage = 0; } // 最初に戻る
			this.setNextState("clear");
		}
	}
	showPreAnimation(){
		this.gr.background(0);
		this.gr.fill(255);
		this.gr.text("STAGE " + this.stage, CANVAS_W * 0.5, CANVAS_H * 0.5);
		image(this.gr, 0, 0);
	}
	draw(){
		if(this.preAnimationSpan > 0){
			this.showPreAnimation();
			return;
		}
		this.gameSystem.draw(); // システム側のdraw.
		//this.gr.background(128);
		this.gr.image(this.bg, 0, 0);
		this.gr.image(this.gameSystem.gr, this.offSet.x, this.offSet.y);
		image(this.gr, 0, 0);
	}
}

// Playからスペースキーで来てスペースキーで去っていく。
// Playからしか来ないので場合分けは要らない
class Pause extends State{
	constructor(_node){
		super(_node);
		this.name = "pause";
		this.gr.fill(255);
		this.gr.textFont(huiFont);
		this.gr.textSize(CANVAS_H * 0.08);
		this.gr.textAlign(CENTER, CENTER);
	}
	drawPrepare(){} // 準備描画（最初に一回だけやる）
  prepare(_state){
		this.gr.image(_state.gr, 0, 0);
		this.gr.background(0, 128);
		this.gr.text("---PAUSE---", CANVAS_W * 0.5, CANVAS_H * 0.38);
		this.gr.text("TO PLAY: SPACE KEY", CANVAS_W * 0.5, CANVAS_H * 0.50);
		this.gr.text("TO TITLE: ENTER KEY", CANVAS_W * 0.5, CANVAS_H * 0.62);
  }
  keyAction(code){
		if(code === K_SPACE){
			this.setNextState("play");
		}else if(code === K_ENTER){
			this.setNextState("title");
		}
	}
	clickAction(){}
	update(){}
	draw(){
		image(this.gr, 0, 0);
	}
}

// ゲームオーバーについてはPlayの画像を借りつつちょっと薄暗くして中央に文字描いて終わり的な。
// テトリスのようなアニメは無くって文字だけ。エンターキーで戻る。
// Playからしか来ない。
/*
class Gameover extends State{
	constructor(_node){
		super(_node);
		this.name = "gameover";
		this.gr.fill(255);
		this.gr.textFont(huiFont);
		this.gr.textSize(CANVAS_H * 0.08);
		this.gr.textAlign(CENTER, CENTER);
	}
	drawPrepare(){} // 準備描画（最初に一回だけやる）
  prepare(_state){
		this.gr.image(_state.gr, 0, 0);
		this.gr.background(0, 128);
		this.gr.text("GAME OVER...", CANVAS_W * 0.5, CANVAS_H * 0.46);
		this.gr.text("CLICK TO TITLE", CANVAS_W * 0.5, CANVAS_H * 0.54);
  }
  keyAction(code){
		if(code === K_ENTER){
			this.setNextState("title");
		}
	}
	clickAction(){
		this.setNextState("title");
	}
	update(){}
	draw(){
		image(this.gr, 0, 0);
	}
}
*/

// Playから来る。stageを読み取り、5より小さいならPlayに戻して次のステージを用意する。
// オールクリア廃止
class Clear extends State{
	constructor(_node){
		super(_node);
		this.name = "clear";
		//this.allClearFlag = false;
		this.gr.fill(255);
		this.gr.textFont(huiFont);
		this.gr.textSize(CANVAS_H * 0.08);
		this.gr.textAlign(CENTER, CENTER);
	}
	drawPrepare(){} // 準備描画（最初に一回だけやる）
  prepare(_state){
		//this.allClearFlag = (_state.stage < 5 ? false : true);
		this.gr.image(_state.gr, 0, 0);
		this.gr.background(0, 128);
		//if(this.allClearFlag){
		//	this.gr.text("STAGE ALL CLEAR!", CANVAS_W * 0.5, CANVAS_H * 0.46);
		//	this.gr.text("CLICK TO TITLE", CANVAS_W * 0.5, CANVAS_H * 0.54);
		//}else{
		this.gr.text("STAGE CLEAR!", CANVAS_W * 0.5, CANVAS_H * 0.46);
		this.gr.text("CLICK TO NEXT STAGE", CANVAS_W * 0.5, CANVAS_H * 0.54);
		//}
	}
  keyAction(code){
		if(code === K_ENTER){
			//if(this.allClearFlag){
			//	this.setNextState("title");
			//}else{
			this.setNextState("play");
			//}
		}
	}
	clickAction(){
		//if(this.allClearFlag){
		//	this.setNextState("title");
		//}else{
		this.setNextState("play");
		//}
	}
	update(){}
	draw(){
		image(this.gr, 0, 0);
	}
}

// ----------------------------------------------------------------------------------- //
// gamesystem.

// play内部でこれを呼び出す感じ
// ライフ上限作ろう。20が上限。それ以上は増やすことを認めない。
class GameSystem{
	constructor(){
		this.gr = undefined; // グラフィック
		this.bg = undefined; // 背景
		//this.score = 0; // スコア廃止
		this.mode = 0;
		this.gutter = new Gutter(); // ガター
		this.blocks = []; // ブロック
		this.ringWalls = []; // リング状の反射目的のオブジェクト
		this.paddles = []; // パドル
		this.ball = new Ball(); // ボール
		this.currentPaddleId = -1; // ボールが属するパドルのid. シフトキーで移動させるのに使う可能性がある
		//this.level = 0;
		this.stage = 0;
		// パーティクルシステム
		// システム側に画像を持たせてそれを乗せるか。
		this.particles = new ParticleSystem();
		// クリア用フラグ（ノーマルを全滅させたところでボールの動きを止めたい）
		this.clearFlag = false; // ノーマル全滅でtrueにする
	}
  stageSetup(w, h){
		// ステージ作りで最初にやる処理
		this.gr = createGraphics(w, h);
		this.gr.noStroke();
		this.gr.colorMode(HSB, 100);
		this.gr.textAlign(LEFT, CENTER);
		this.gr.textSize(30);
		this.gr.textFont(huiFont);
		this.particles.setGraphic(w, h);
		this.blocks = [];
		this.paddles = [];
		this.createBackground(w, h);
	}
	createBackground(w, h){
		this.bg = createGraphics(w, h);
		this.bg.noStroke();
		// 黒と青のグラデーション
		let p;
		for(let i = 0; i < 200; i++){
			p = i / 200;
			p = pow(p, 3);
			this.bg.fill(40 * p, 49 * p, 153 * p);
			this.bg.rect(0, i * h / 200, w, h / 200);
		}
		// 星を配置
		let x, y;
		for(let i = 0; i < 10; i++){
			x = w * (0.1 + Math.random() * 0.8);
			y = 60 + h * (0.1 + Math.random() * 0.3);
		  drawStar(x, y, 2 + 3 * Math.random(), 0, color(255, 242, 0), this.bg);
		}
	}
	setBlock(gridX, gridY, gridW, gridH, _type = WALL, tough = Infinity){
		// ブロック設置用の簡易メソッド
		this.blocks.push(new Block(gridX, gridY, gridW, gridH, _type, tough));
	}
	setBlockGroup(xArray, yArray, wArray, hArray, _type = WALL, tough = Infinity){
		// まとめて
		for(let i = 0; i < xArray.length; i++){
			this.blocks.push(new Block(xArray[i], yArray[i], wArray[i], hArray[i], _type, tough));
		}
	}
	setPattern(stage){
		this.stage = stage; // 描画用
		// ボール
		this.ball.initialize(); // ボールの初期化
		// パーティクルが残っていれば全部空にする
		if(!this.particles.isEmpty()){
			this.particles.removeAll();
		}
		// パターンを用意する
		window["createStage" + stage]();
    // ボールをパドルにセットする
		this.paddles[0].setBall(this.ball);
		this.currentPaddleId = 0;
		// クリアフラグのリセット
		this.clearFlag = false;
	}
	initialize(mode){
		// レベルの最初に行なう処理。スコアのリセットとライフ設定
		//this.score = 0; // スコア廃止
		this.mode = mode;
		//this.ball.setLife(LIFES[mode]);
	}
	getOffSet(){
		return {x:(CANVAS_W - this.gr.width) * 0.5, y:(CANVAS_H - this.gr.height) * 0.5};
	}
	outsideCheck(){
		return this.ball.x < 0 || this.ball.x > this.gr.width || this.ball.y < 0 || this.ball.y > this.gr.height;
	}
	clickAction(){
		// ボールがnonActive: activateしておわり。active:すべてのパドルをactivateする
		if(this.currentPaddleId >= 0){
			// ボールが画面外にいるときは反応させない
			if(this.outsideCheck()){ return; }
			this.paddles[this.currentPaddleId].removeBall();
			this.ball.activate();
			this.currentPaddleId = -1;
		}else{
			for(let pdl of this.paddles){ pdl.activate(); }
		}
	}
	getCollidePoint(){
		// パーティクルの出現場所を計算する
		return {x:this.ball.x + this.ball.radius * Math.cos(this.ball.direction),
			      y:this.ball.y + this.ball.radius * Math.sin(this.ball.direction)};
	}
	createBallParticle(p, drawFunction, particleNum){
		// ボールのパーティクル
		this.particles.createParticle(p.x, p.y, color(BREAK_PALETTE[6 + this.ball.level]), drawFunction, particleNum);
	}
	createMovingParticle(){
		// ボールがレベル1か2のときに移動中のパーティクルを出す
		// 個数はレベルで出現位置は後ろ
		const lv = this.ball.getLevel();
		if(lv < 1){ return; }
		const {x, y, radius:r} = this.ball;
		const d = this.ball.getDirection();
		this.particles.createParticle(x - r * cos(d), y - r * sin(d), color(BREAK_PALETTE[6 + this.ball.level]),
	                                drawSquare, lv, 0.35, false, d + Math.PI, d + Math.PI);
	}
	createBlockParticle(p, id, particleNum){
		// ブロックのパーティクル
		// のちに円形ブロック使うようになったらまた変わるかもだけどね。円形には当たると強制アクティベートの付加効果を持たせるつもり
		this.particles.createParticle(p.x, p.y, color(BREAK_PALETTE[id]), drawStar, particleNum);
	}
	createBlockSound(_type, id = 0){
		switch(_type){
			case WALL:
			  myMusic.playWallSound();
				break;
			case NORMAL:
			  myMusic.playBlockSound(id + 7 * this.ball.level);
				break;
		}
	}
	getAdditionalBlocks(b){
		let add = [];
		for(let x = 0; x < b.w / GRIDSIZE; x++){
			for(let y = 0; y < b.h / GRIDSIZE; y++){
				add.push(new Block(b.x / GRIDSIZE + x, b.y / GRIDSIZE + y, 1, 1, NORMAL, 1));
			}
		}
		return add;
	}
	collideWithBlocks(){
		// 衝突時はボール側だけパーティクル出そうか（小さいの）
		// 壊れるようなら・・その分も出す。
		for(let b of this.blocks){
			if(b.collider.collideWithBall(this.ball)){
				// 先にパーティクル出さないと壊れた後のtoughが参照されちゃうのでダメ
				// toughは1ベースなのでそこ注意かな・・んー。
				const p = this.getCollidePoint();
				// ボール側
				this.createBallParticle(p, drawCross, 5);
				// ブロック側は壊れるかどうかで場合分け。壊れないなら5個しか出さない方向で。
				const id = b.getId();
				this.createBlockSound(b.blockType, id);
				b.hitWithBall(this.ball);
				if(b.isAlive()){
					this.createBlockParticle(p, id, 5);
				}else{
					this.createBlockParticle(p, id, 20);
				}
				this.ball.hitWithBlock(b);
				// ブロックがボールにより壊れるときにボールのattackが自身のtough+2以上なら
				// ボールのpenetrateフラグを立てる、それが立ってるときは反射しない。そのあと戻す。
				if(this.ball.getPenetrate()){
					// 貫通の場合はここで抜ける
					this.ball.setPenetrate(false);
					break;
				}
				b.collider.reflect(this.ball); // ここで反射処理
				break;
			}
		}
		// RingWall判定を置くとすればここ。
		for(let ring of this.ringWalls){
			if(ring.collider.collideWithBall(this.ball)){
				const p = this.getCollidePoint();
				this.createBallParticle(p, drawCross, 5);
				this.createBlockSound(WALL);
				ring.collider.reflect(this.ball);
				break;
			}
		}
		// 壊したブロックがあればそれを排除する処理
		let id = -1;
		let additionalBlocks = [];
		for(let i = 0; i < this.blocks.length; i++){
			let b = this.blocks[i];
			if(!b.isAlive()){
				// 分裂があればここでブロックを追加
				if(b.hasChild){ additionalBlocks = this.getAdditionalBlocks(b); }
				id = i;
				break;
			}
		}
		if(id >= 0){ this.blocks.splice(id, 1); }
		this.blocks.push(...additionalBlocks); // 追加があれば追加
	}
	collideWithPaddles(){
		for(let pdl of this.paddles){
			if(pdl.collider.collideWithBall(this.ball)){
				// ボール側
				const p = this.getCollidePoint();
				this.createBallParticle(p, drawCross, 5);
				this.ball.hitWithPaddle(pdl);
				pdl.collider.reflect(this.ball);
				break;
			}
		}
	}
	update(){
		this.particles.update(); // パーティクルのアップデート
		this.particles.remove(); // パーティクルのリムーブ
		if(!this.ball.isAlive()){ return; } // ボールが死んだら以降の処理をキャンセル
		const offSet = this.getOffSet();
		const mx = constrain((mouseX - offSet.x) / this.gr.width, 0, 1);
		const my = constrain((mouseY - offSet.y) / this.gr.height, 0, 1);
		let paddleParticlePosList = [];
		for(let pdl of this.paddles){
			pdl.move(mx, my); pdl.updateBall(); pdl.update();
		}
		if(this.ball.isActive()){
			this.collideWithPaddles();
			this.collideWithBlocks();
	  }
		// ここでフラグをチェック
		this.clearFlag = true;
		for(let b of this.blocks){
			if(b.blockType === NORMAL){ this.clearFlag = false; break; }
		}
		if(this.clearFlag){ return; } // クリア条件を満たしたら以降の処理はキャンセル
		this.ball.update();
		// ここで移動時パーティクル生成
		this.createMovingParticle();
		if(this.ball.isActive()){
			// ボールが画面外に出たら死ぬ仕様を追加
			if(this.gutter.check(this.ball) || this.outsideCheck()){
				// ボールがやられるときのパーティクルは6番以降の色を使う。三角形。
				const p = this.getCollidePoint();
				// 音を出すね
				myMusic.playDeathSound();
				this.createBallParticle(p, drawTriangle, 20);
				this.ball.kill();
			}
		}
	}
	revival(){
		// 復活処理
		// ここでパーティクルが残ってたら移動しないようにする・・
		if(!this.particles.isEmpty()){ return false; }
		// 生きてたら処理なし
		if(this.ball.isAlive()){ return false; }
    this.ball.initialize();
		this.paddles[0].setBall(this.ball);
		this.currentPaddleId = 0;
	}
	clearCheck(){
		// パーティクルが残ってたら移動しないようにする・・
		if(!this.particles.isEmpty()){ return false; }
		/*
		for(let b of this.blocks){
			if(b.blockType === NORMAL){ return false; }
		}
		*/
		return this.clearFlag;
	}
	draw(){
		// 背景
		this.gr.image(this.bg, 0, 0);
		//this.gr.background(0);
		// ブロック、パドル、ボール
		for(let b of this.blocks){ b.draw(this.gr); }
		for(let ring of this.ringWalls){ ring.draw(this.gr); }
		for(let pdl of this.paddles){ pdl.draw(this.gr); }
		if(this.ball.isAlive()){ this.ball.draw(this.gr); }
		// ガター
		this.gutter.draw(this.gr);
		// パーティクルの描画
		this.particles.draw(this.gr);
		// コンフィグパート
		this.gr.fill(0, 0, 100);
		// ステージ番号を描画
		this.gr.text("STAGE " + this.stage, 10, 25);
	}
}

// ----------------------------------------------------------------------------------- //
// pattern.
// ステージパターン（量産型の）。
// 具体的にはガター、パドル、WALL型ブロックの一部とringWallの指定を行なう。
// それ以外の部分は個別に用意する感じね。予定では0～24は円形パドルは出さないつもり。

// stagePatternとstageを分ける感じね。createStageの中で何らかのパターンを呼び出すっていうね。

// オーソドックスなパドルが1つのステージ
// ガターは両サイド2つと下にひとつ
// パドルは下に一つで普通に左右に動くだけ
// 480x440だけどサイズ的には480x380. 両サイドにガターとブロックで20x380の底面に480x20.その上にパドル1つ。
// ブロックはその上の(20,60)～(460,420)でグリッド的には(1,3)～(23,21)です。
function createStagePattern0(){
	let sys = mySystem.state.play.gameSystem;
	// setup
	sys.stageSetup(480, 440);
	// ガター
	const colliders = [new RectCollider(0, 420, 480, 20), new RectCollider(0, 60, 16, 380), new RectCollider(464, 60, 16, 380)];
	sys.gutter.setting(480, 440, colliders);
	// ブロック
	sys.blocks.push(new Block(0.8, 3, 0.2, 18));
	sys.blocks.push(new Block(23, 3, 0.2, 18));
	sys.blocks.push(new Block(1, 3, 22, 1));
	// パドル
	const paddleLength = PADDLE_LENGTH[sys.mode];
	sys.paddles.push(new LinePaddle(20, 460 - paddleLength, 416, 416, paddleLength, 4, -PI/2));
}

// 上下パドル
// 間延びしがちなので適度に壊せないブロック置かないと退屈になる可能性あり。他のステージにも言えるけどね。
function createStagePattern1(){
	let sys = mySystem.state.play.gameSystem;
	// setup
	sys.stageSetup(480, 460);
	// ガター
	const colliders = [new RectCollider(0, 60, 480, 20), new RectCollider(0, 440, 480, 20),
	                   new RectCollider(0, 80, 16, 360), new RectCollider(464, 80, 16, 360)];
	sys.gutter.setting(480, 460, colliders);
	// ブロック
	sys.blocks.push(new Block(0.8, 4, 0.2, 18));
	sys.blocks.push(new Block(23, 4, 0.2, 18));
	// パドル
	const paddleLength = PADDLE_LENGTH[sys.mode];
	sys.paddles.push(new LinePaddle(20, 460 - paddleLength, 436, 436, paddleLength, 4, -PI / 2),
                   new LinePaddle(20, 460 - paddleLength, 80, 80, paddleLength, 4, PI / 2));
}

// 0.
function createStage0(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	for(let x = 6; x <= 16; x += 2){
		for(let y = 7; y <= 8; y++){
			sys.setBlock(x, y, 2, 1, NORMAL, 1);
		}
	}
	for(let x = 6; x <= 16; x += 2){
		for(let y = 12; y <= 13; y++){
			sys.setBlock(x, y, 2, 1, NORMAL, 2);
		}
	}
}

// 1.
function createStage1(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	sys.setBlockGroup([11, 9, 11, 13, 7, 9, 13, 15], [5, 6, 6, 6, 7, 7, 7, 7],
		                [2, 2, 2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1, 1, 1], NORMAL, 1);
	sys.setBlockGroup([7, 9, 13, 15, 5, 7, 15, 17], [9, 9, 9, 9, 10, 10, 10, 10],
		                [2, 2, 2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1, 1, 1], NORMAL, 2);
	sys.setBlockGroup([5, 7, 15, 17, 3, 5, 17, 19], [12, 12, 12, 12, 13, 13, 13, 13],
		                [2, 2, 2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1, 1, 1], NORMAL, 3);
	//sys.setBlock(11, 4, 2, 1, LIFEUP, 1);
}

// 2.
function createStage2(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	sys.setBlockGroup([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21], [9, 8, 7, 6, 5, 4, 5, 6, 7, 8, 9],
		                [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], NORMAL, 1);
	sys.setBlockGroup([3, 5, 7, 9, 11, 13, 15, 17, 19], [10, 9, 8, 7, 6, 7, 8, 9, 10],
		                [2, 2, 2, 2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1, 1, 1, 1], NORMAL, 2);
	sys.setBlockGroup([5, 7, 9, 11, 13, 15, 17], [11, 10, 9, 8, 9, 10, 11],
		                [2, 2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1, 1], NORMAL, 3);
	//sys.setBlock(11, 5, 2, 1, LIFEUP, 1);
}

// 3.
function createStage3(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	//sys.setBlock(11, 4, 2, 1, LIFEUP, 1);
	sys.setBlockGroup([7, 15], [6, 6], [2, 2], [1, 1], NORMAL, 1);
	for(let x = 9; x <= 13; x += 2){for(let y = 5; y <= 7; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 1); }}
	sys.setBlockGroup([5, 17], [7, 7], [2, 2], [1, 1], NORMAL, 2);
	for(let x = 1; x <= 7; x += 2){for(let y = 8; y <= 9; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 2); }}
	for(let x = 15; x <= 21; x += 2){for(let y = 8; y <= 9; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 2); }}
	for(let x = 1; x <= 7; x += 2){for(let y = 12; y <= 13; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 3); }}
	for(let x = 15; x <= 21; x += 2){for(let y = 12; y <= 13; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 3); }}
}

// 4.
function createStage4(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	//sys.setBlock(11, 5, 2, 1, LIFEUP, 1);
	for(let x = 3; x <= 7; x += 2){for(let y = 5; y <= 6; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 1); }}
	for(let x = 15; x <= 19; x += 2){for(let y = 5; y <= 6; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 1); }}
	for(let x = 9; x <= 13; x += 2){for(let y = 9; y <= 10; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 2); }}
	for(let x = 1; x <= 5; x += 2){for(let y = 10; y <= 11; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 3); }}
	for(let x = 17; x <= 21; x += 2){for(let y = 10; y <= 11; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 3); }}
	sys.setBlockGroup([7, 9, 11, 13, 15], [12, 13, 13, 13, 12], [2, 2, 2, 2, 2], [1, 1, 1, 1, 1], NORMAL, 4);
	sys.setBlockGroup([3, 5, 11, 11, 17, 19], [8, 8, 6, 7, 8, 8], [2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1], NORMAL, 5);
}

// 5.
function createStage5(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	for(let y = 6; y <= 14; y += 2){sys.setBlock(3, y, 1, 2, NORMAL, 1); }
	for(let y = 6; y <= 14; y += 2){sys.setBlock(20, y, 1, 2, NORMAL, 1); }
	for(let y = 6; y <= 14; y += 2){sys.setBlock(4, y, 1, 2, NORMAL, 2); }
	for(let y = 6; y <= 14; y += 2){sys.setBlock(19, y, 1, 2, NORMAL, 2); }
	for(let x = 7; x <= 15; x += 2){sys.setBlock(x, 7, 2, 1, NORMAL, 1); }
	for(let x = 7; x <= 15; x += 2){sys.setBlock(x, 8, 2, 1, NORMAL, 2); }
	for(let x = 7; x <= 15; x += 2){sys.setBlock(x, 12, 2, 1, NORMAL, 2); }
	for(let x = 7; x <= 15; x += 2){sys.setBlock(x, 13, 2, 1, NORMAL, 3); }
	sys.setBlockGroup([9, 11, 13], [10, 10, 10], [2, 2, 2], [1, 1, 1], NORMAL, 5);
	//sys.setBlock(11, 9, 2, 1, LIFEUP, 1);
}

// 6.
function createStage6(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	sys.setBlockGroup([11, 11, 11, 7, 7, 15, 15], [4, 10, 12, 11, 12, 11, 12],
		                [2, 2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1, 1], NORMAL, 5);
	//sys.setBlock(11, 5, 2, 1, LIFEUP, 1);
	sys.setBlockGroup([4, 3, 18, 19, 3, 5, 18, 20], [6, 8, 6, 8, 6, 7, 7, 6],
		                [2, 2, 2, 2, 1, 1, 1, 1], [1, 1, 1, 1, 2, 2, 2, 2], NORMAL, 1);
  sys.setBlockGroup([7, 8, 10, 12, 14, 15, 7, 9, 14, 16, 9, 13], [10, 8, 8, 8, 8, 10, 8, 9, 9, 8, 11, 11],
		                [2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2], [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1], NORMAL, 2);
  sys.setBlockGroup([2, 3, 5, 17, 19, 20, 2, 4, 19, 21], [11, 13, 12, 12, 13, 11, 12, 11, 11, 12],
		                [2, 2, 2, 2, 2, 2, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 2, 2, 2, 2], NORMAL, 3);
}

// 7.
function createStage7(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	//sys.setBlock(3, 5, 2, 1, LIFEUP, 1);
	sys.setBlockGroup([20, 21, 21, 21, 21, 21, 21], [4, 4, 6, 8, 10, 12 ,14],
		                [1, 1, 1, 1, 1, 1, 1], [1, 2, 2, 2, 2, 2, 2], NORMAL, 1);
  sys.setBlockGroup([2, 2, 2, 2, 2, 2, 3, 3], [4, 6, 8, 10, 12 ,14, 4, 14],
									  [1, 1, 1, 1, 1, 1, 1, 1], [2, 2, 2, 2, 2, 2, 1, 1], NORMAL, 2);
	for(let x = 3; x <= 15; x += 2){sys.setBlock(x, 15, 2, 1, NORMAL, 3); }
	for(let x = 7; x <= 19; x += 2){sys.setBlock(x, 11, 2, 1, NORMAL, 4); }
	sys.setBlock(20, 10, 1, 1, NORMAL, 4);
	for(let x = 3; x <= 15; x += 2){sys.setBlock(x, 7, 2, 1, NORMAL, 5); }
	sys.setBlock(3, 8, 1, 1, NORMAL, 5);
}

// 8.
function createStage8(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	//sys.setBlockGroup([11, 11], [7, 8], [2, 2], [1, 1], LIFEUP, 1);
	sys.setBlockGroup([8, 10, 12, 14, 11, 12], [12, 12, 12, 12, 13, 13],
		                [2, 2, 2, 2, 1, 1], [1, 1, 1, 1, 2, 2], NORMAL, 1);
  sys.setBlockGroup([3, 5, 3, 5, 7, 18, 20, 16, 18, 20], [9, 9, 13, 13, 13, 9, 9, 13, 13, 13],
									  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [2, 2, 2, 2, 2, 2, 2, 2, 2, 2], NORMAL, 2);
	for(let x = 7; x <= 15; x += 2){sys.setBlock(x, 9, 2, 1, NORMAL, 2); }
	sys.setBlockGroup([7, 9, 13, 15, 7, 9, 13, 15, 4, 6, 17, 19], [7, 7, 7, 7, 8, 8, 8, 8, 11, 11, 11, 11],
									  [2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2], NORMAL, 3);
  sys.setBlockGroup([3, 5, 17, 19, 3, 5, 17, 19], [7, 7, 7, 7, 8, 8, 8, 8],
										[2, 2, 2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1, 1, 1], NORMAL, 4);
  sys.setBlockGroup([7, 9, 13, 15], [6, 6, 6, 6],
										[2, 2, 2, 2], [1, 1, 1, 1], NORMAL, 5);
}

// 9.
function createStage9(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	//sys.setBlockGroup([3, 19], [7, 7], [2, 2], [1, 1], LIFEUP, 1);
	sys.setBlockGroup([1, 1, 1, 21, 21, 21], [12, 13, 14, 12, 13, 14], [2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1], NORMAL, 1);
	sys.setBlockGroup([1, 1, 21, 21], [9, 10, 9, 10], [2, 2, 2, 2], [1, 1, 1, 1], NORMAL, 2);
	sys.setBlockGroup([1, 3, 9, 13, 19, 21], [8, 8, 5, 5, 8, 8], [2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1], NORMAL, 3);
	for(let x = 8; x <= 14; x += 2){sys.setBlock(x, 7, 2, 1, NORMAL, 3); }
	for(let y = 8; y <= 12; y += 2){sys.setBlock(6, y, 1, 2, NORMAL, 3); }
	for(let y = 8; y <= 12; y += 2){sys.setBlock(17, y, 1, 2, NORMAL, 3); }
	sys.setBlockGroup([8, 15], [10, 10], [1, 1], [2, 2], NORMAL, 4);
	for(let x = 8; x <= 14; x += 2){sys.setBlock(x, 9, 2, 1, NORMAL, 4); }
	for(let x = 8; x <= 14; x += 2){sys.setBlock(x, 12, 2, 1, NORMAL, 4); }
	sys.setBlockGroup([11, 11], [10, 11], [2, 2], [1, 1], NORMAL, 5);
}

// 10以降作る前に、あれ、40x40以上のときに分裂する仕様作る。条件はNORMALかLIFEで1でダメージが1のときに限り、
// 攻撃力1で受けて0になった場合に限り、小さいものに分裂する、みたいな。オーバーキルならOK.オレンジで攻撃2で消える場合もOK.
function createStage10(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	sys.setBlockGroup([1, 1, 18, 22, 5, 18], [4, 5, 4, 5, 8, 8], [5, 1, 5, 1, 1, 1], [1, 4, 1, 4, 1, 1]);
	for(let x = 8; x <= 14; x += 2){for(let y = 5; y <= 6; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 1); }}
	for(let x = 8; x <= 14; x += 2){for(let y = 7; y <= 8; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 2); }}
	for(let x = 8; x <= 14; x += 2){for(let y = 9; y <= 10; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 3); }}
	for(let x = 8; x <= 14; x += 2){sys.setBlock(x, 11, 2, 2, NORMAL, 2); }
	for(let x = 8; x <= 14; x += 2){sys.setBlock(x, 13, 2, 2, NORMAL, 1); }
	sys.setBlockGroup([2, 4, 6, 16, 18, 20], [11, 9, 7, 7, 9, 11], [2, 2, 2, 2, 2, 2], [2, 2, 2, 2, 2, 2], NORMAL, 3);
}

// 11
function createStage11(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	sys.setBlockGroup([3, 20], [6, 6], [1, 1], [1, 1]);
  sys.setBlockGroup([7, 7, 16, 16, 11], [6, 10, 6, 10, 6], [1, 1, 1, 1, 2], [1, 1, 1, 1, 1], NORMAL, 1);
	sys.setBlockGroup([6, 8, 15, 17, 6, 8, 15, 17, 6, 16, 11], [7, 7, 7, 7, 9, 9, 9, 9, 13, 13, 7],
		                [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], NORMAL, 2);
	sys.setBlockGroup([5, 17, 4, 19, 5, 9, 14, 18, 8, 14, 4, 18], [5, 5, 6, 6, 8, 8, 8, 8, 11, 11, 12, 12],
		                [2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2], [1, 1, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1], NORMAL, 3);
	for(let x = 10; x <= 12; x += 2){for(let y = 9; y <= 10; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 3); }}
	//sys.setBlockGroup([11, 11], [5, 8], [2, 2], [1, 1], LIFEUP, 1);
	sys.setBlockGroup([2, 20, 1, 4, 19, 22, 2, 20, 9, 13], [8, 8, 9, 9, 9, 9, 11, 11, 5, 5],
		                [2, 2, 1, 1, 1, 1, 2, 2, 2, 2], [1, 1, 2, 2, 2, 2, 1, 1, 1, 1], NORMAL, 4);
  sys.setBlockGroup([5, 17], [10, 10], [2, 2], [2, 2], NORMAL, 5);
}

// 12.
function createStage12(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	sys.setBlockGroup([3, 3, 18, 20], [6, 7, 6, 7], [3, 1, 3, 1], [1, 4, 1, 4]);
	//sys.setBlockGroup([3, 19], [5, 5], [2, 2], [1, 1], LIFEUP, 1);
	sys.setBlockGroup([2, 6, 7, 8, 14, 16, 16, 20], [13, 9, 11, 13, 13, 9, 11, 13],
		                [2, 2, 1, 2, 2, 2, 1, 2], [1, 1, 2, 1, 1, 1, 2, 1], NORMAL, 1);
	for(let y = 9; y <= 13; y += 1){sys.setBlock(4, y, 2, 1, NORMAL, 1); }
	for(let y = 9; y <= 13; y += 1){sys.setBlock(18, y, 2, 1, NORMAL, 1); }
	sys.setBlockGroup([11, 12, 11, 12, 11], [5, 7, 9, 11, 13], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], NORMAL, 2);
	sys.setBlockGroup([13, 10, 13, 10], [6, 8, 9, 11], [1, 1, 1, 1], [1, 1, 1, 1], NORMAL, 3);
	sys.setBlockGroup([6, 8, 14, 16, 8, 14], [7, 7, 7, 7, 10, 10], [2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1], NORMAL, 3);
	sys.setBlockGroup([4, 18], [7, 7], [2, 2], [2, 2], NORMAL, 3);
	sys.setBlockGroup([1, 21], [9, 9], [2, 2], [2, 2], NORMAL, 4);
}

// 13.
function createStage13(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	//sys.setBlockGroup([7, 5], [7, 9], [2, 2], [1, 1], LIFEUP, 1);
	sys.setBlockGroup([1, 1], [13, 15], [2, 2], [2, 2], NORMAL, 2);
	for(let x = 4; x <= 20; x += 2){sys.setBlock(x, 5, 2, 1, NORMAL, 1); }
	for(let y = 6; y <= 10; y += 2){sys.setBlock(21, y, 1, 2, NORMAL, 2); }
  sys.setBlockGroup([2, 5, 7, 20], [5, 7, 8, 14], [2, 2, 2, 2], [2, 2, 2, 2], NORMAL, 3);
  sys.setBlockGroup([2, 2, 2, 21], [7, 9, 11, 12], [1, 1, 1, 1], [2, 2, 2, 2], NORMAL, 3);
	for(let x = 8; x <= 18; x += 2){sys.setBlock(x, 15, 2, 1, NORMAL, 3); }
  sys.setBlockGroup([15, 14], [8, 10], [1, 2], [2, 2], NORMAL, 4);
	for(let x = 4; x <= 12; x += 2){sys.setBlock(x, 11, 2, 1, NORMAL, 4); }
  sys.setBlockGroup([11, 11, 17, 18, 17, 18], [7, 8, 7, 8, 10, 11], [2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1], NORMAL, 5);
}

// 14.
function createStage14(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	for(let y = 6; y <= 15; y += 3){sys.setBlock(1, y, 2, 1); }
	for(let y = 4; y <= 13; y += 3){sys.setBlock(21, y, 2, 1); }
	//sys.setBlockGroup([3, 12], [7, 4], [2, 2], [1, 1], LIFEUP, 1);
	sys.setBlockGroup([9, 9, 10, 11, 17, 18, 18, 19], [7, 8, 9, 7, 10, 9, 11, 10],
		                [2, 1, 2, 1, 1, 1, 1, 1], [1, 2, 1, 2, 1, 1, 1, 1], NORMAL, 2);
	sys.setBlockGroup([6, 8, 10], [10, 11, 12], [2, 2, 2], [2, 2, 2], NORMAL, 3);
	sys.setBlockGroup([6, 8, 8, 10, 15, 15, 16, 17], [12, 10, 13, 11, 7, 9, 7, 8],
		                [2, 2, 2, 2, 1, 2, 2, 1], [1, 1, 1, 1, 2, 1, 1, 2], NORMAL, 3);
	sys.setBlockGroup([7, 10, 14, 16], [6, 5, 5, 6], [2, 2, 2, 2], [1, 1, 1, 1], NORMAL, 3);
	sys.setBlockGroup([13, 14, 14, 15], [11, 10, 12, 11], [1, 1, 1, 1], [1, 1, 1, 1], NORMAL, 3);
	sys.setBlockGroup([5, 6, 6, 7], [8, 7, 9, 8], [1, 1, 1, 1], [1, 1, 1, 1], NORMAL, 4);
	sys.setBlockGroup([12, 13, 13, 14], [7, 6, 8, 7], [1, 1, 1, 1], [1, 1, 1, 1], NORMAL, 5);
	sys.setBlockGroup([3, 8, 18, 19, 4, 18], [14, 4, 5, 14, 12, 12], [2, 2, 2, 2, 2, 2], [2, 2, 2, 2, 1, 1], NORMAL, 5);
}

// 15.
function createStage15(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	for(let x = 3; x <= 19; x += 2){ sys.setBlock(x, 6, 2, 1, NORMAL, 1); }
	for(let x = 3; x <= 19; x += 2){ sys.setBlock(x, 7, 2, 1, NORMAL, 2); }
	for(let x = 3; x <= 19; x += 2){ sys.setBlock(x, 8, 2, 1, NORMAL, 3); }
	for(let x = 3; x <= 19; x += 2){sys.setBlock(x, 9, 2, 1, NORMAL, 4); }
	for(let x = 3; x <= 19; x += 2){sys.setBlock(x, 10, 2, 1, NORMAL, 5); }
	sys.setBlockGroup([5, 7, 9, 11, 13, 15, 17], [11, 12, 13, 12, 13, 12, 11],
		                [2, 2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1, 1], NORMAL, 1);
}

// 16.
function createStage16(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	sys.setBlockGroup([7, 15], [7, 7], [2, 2], [1, 1]);
	//sys.setBlockGroup([11, 11], [6, 9], [2, 2], [1, 1], LIFEUP, 1);
	sys.setBlockGroup([9, 13], [6, 6], [2, 2], [1, 1], NORMAL, 4);
	for(let x = 8; x <= 14; x += 2){sys.setBlock(x, 10, 2, 1, NORMAL, 3); }
	sys.setBlockGroup([2, 3, 5, 7, 9, 11, 12, 14, 15, 17, 19, 21], [12, 14, 13, 14, 11, 11, 11, 11, 14, 13, 14, 12],
		                [1, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 1], [2, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 2], NORMAL, 1);
	sys.setBlockGroup([4, 5, 7, 15, 17, 19, 3, 3, 19, 19], [6, 6, 6, 6, 6, 6, 8, 10, 8, 10],
										[1, 2, 2, 2, 2, 1, 2, 2, 2, 2], [2, 1, 1, 1, 1, 2, 2, 2, 2, 2], NORMAL, 5);
	sys.setBlockGroup([5, 5, 6, 7, 16, 16, 17, 18], [8, 9, 10, 8, 8, 10, 8, 9],
										[2, 1, 2, 1, 1, 2, 2, 1], [1, 2, 1, 2, 2, 1, 1, 2], NORMAL, 5);
}

// 17.
function createStage17(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	//sys.setBlockGroup([9, 13], [7, 7], [2, 2], [1, 1], LIFEUP, 1);
	sys.setBlockGroup([3, 19], [5, 5], [2, 2], [1, 1], NORMAL, 3);
	for(let x = 7; x <= 15; x += 4){sys.setBlock(x, 5, 2, 1, NORMAL, 4); }
	for(let x = 4; x <= 18; x += 2){sys.setBlock(x, 6, 2, 1, NORMAL, 3); }
	for(let y = 6; y <= 14; y += 2){sys.setBlock(3, y, 1, 2, NORMAL, 3); }
	for(let y = 6; y <= 14; y += 2){sys.setBlock(20, y, 1, 2, NORMAL, 3); }
	for(let y = 7; y <= 14; y += 1){sys.setBlock(11, y, 2, 1, NORMAL, 3); }
	sys.setBlockGroup([9, 10, 13, 14], [14, 13, 13, 14], [1, 1, 1, 1], [1, 1, 1, 1], NORMAL, 5);
	for(let y = 8; y <= 12; y += 1){sys.setBlock(7, y, 2, 1, NORMAL, 4); }
	for(let y = 8; y <= 12; y += 1){sys.setBlock(15, y, 2, 1, NORMAL, 4); }
}

// 18.
function createStage18(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	sys.setBlockGroup([10, 12], [9, 11], [2, 2], [1, 1]);
	//sys.setBlockGroup([11, 4, 18], [4, 10, 10], [2, 2, 2], [1, 1, 1], LIFEUP, 1);
	sys.setBlockGroup([2, 4, 6, 6, 6, 8, 8, 14, 14, 16, 16, 16, 18, 20], [8, 7, 6, 8, 12, 5, 13, 5, 13, 6, 8, 12, 7, 8],
		                [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], NORMAL, 1);
	sys.setBlockGroup([11, 11, 11, 11], [6, 7, 13, 14], [2, 2, 2, 2], [1, 1, 1, 1], NORMAL, 2);
	sys.setBlockGroup([11, 10, 10, 12, 12], [5, 8, 12, 8, 12], [2, 2, 2, 2, 2], [1, 1, 1, 1, 1], NORMAL, 3);
	sys.setBlockGroup([2, 2, 2, 2, 4, 4, 18, 18, 20, 20, 20, 20], [10, 12, 13, 14, 9, 11, 9, 11, 10, 12, 13, 14],
		                [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], NORMAL, 3);
	sys.setBlockGroup([6, 16], [10, 10], [2, 2], [1, 1], NORMAL, 4);
	sys.setBlockGroup([8, 8, 14, 14], [9, 11, 9, 11], [2, 2, 2, 2], [1, 1, 1, 1], NORMAL, 5);
}

// 19.
function createStage19(){
	createStagePattern0()
	let sys = mySystem.state.play.gameSystem;
	//sys.setBlockGroup([1, 21], [6, 6], [2, 2], [1, 1], LIFEUP, 1);
	sys.setBlockGroup([11, 11], [7, 10], [2, 2], [1, 1], NORMAL, 4);
	for(let x = 7; x <= 15; x += 2){sys.setBlock(x, 5, 2, 1, NORMAL, 3); }
	for(let x = 7; x <= 15; x += 2){sys.setBlock(x, 6, 2, 1, NORMAL, 4); }
	for(let x = 1; x <= 5; x += 2){sys.setBlock(x, 7, 2, 1, NORMAL, 3); }
	for(let x = 17; x <= 21; x += 2){sys.setBlock(x, 7, 2, 1, NORMAL, 3); }
	for(let x = 1; x <= 21; x += 2){sys.setBlock(x, 8, 2, 1, NORMAL, 5); }
	for(let x = 1; x <= 21; x += 2){sys.setBlock(x, 9, 2, 1, NORMAL, 3); }
	for(let x = 7; x <= 15; x += 2){sys.setBlock(x, 11, 2, 1, NORMAL, 2); }
	for(let x = 1; x <= 5; x += 2){sys.setBlock(x, 12, 2, 1, NORMAL, 3); }
	for(let x = 17; x <= 21; x += 2){sys.setBlock(x, 12, 2, 1, NORMAL, 3); }
	for(let x = 7; x <= 15; x += 2){sys.setBlock(x, 13, 2, 1, NORMAL, 2); }
	for(let x = 1; x <= 3; x += 2){for(let y = 10; y <= 11; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 1); }}
	for(let x = 19; x <= 21; x += 2){for(let y = 10; y <= 11; y++){ sys.setBlock(x, y, 2, 1, NORMAL, 1); }}
}

function createStage25(){
	createStagePattern1()
	let sys = mySystem.state.play.gameSystem;
	sys.setBlock(11, 11, 2, 1, NORMAL, 5);
}

// ----------------------------------------------------------------------------------- //
// ball.

// グラフィックはとりあえず後でいいです
// パドルでたたくと2段階までパワーアップ
// 1段階：スピードが4から6になり攻撃力2になる
// 2段階：スピードが6から7になり攻撃力3になる。攻撃力-耐久力が2以上の場合ブロックは反射せず貫通する（実装予定）
class Ball{
	constructor(){
		this.x = 0;
		this.y = 0;
		// this.life = 0; // life廃止
		this.alive = true;
		this.level = 0;
		this.attack = 1;
		this.speed = 4;
		this.direction = 0;
		this.active = false; // ひっついてるときnon-active.
		this.radius = 8;
		this.nonActiveFrameCount = 0;
		this.poweredCount = 0; // 240カウントごとにレベルが下がる
		this.gr = createGraphics(this.radius * 2, this.radius * 2);
		// 先に中心においておく
		this.gr.translate(this.radius, this.radius);
		this.grList = createGraphics(this.radius * 6, this.radius * 2);
		this.grList.colorMode(HSB, 100);
		this.grList.noStroke();
		this.prepareBallGraphics();
		this.gr.image(this.grList, -this.radius, -this.radius);
		this.penetrate = false; // trueのとき貫通。こっちのattackが向こうのtough+2以上。
		this.rotationSpeed = 0.1;
	}
	prepareBallGraphics(){
		let g = this.grList;
		const r = this.radius;
    g.noFill();
		g.colorMode(HSB, 100);
		g.translate(r, r);
		for(let x = 0; x < 3; x++){
			for(let s = r; s > 0; s--){
				switch(x){
					case 0:
					  g.stroke(50 + 50 - s * 50 / r); break;
					case 1:
					  g.stroke(25, s * 100 / r, 100); break;
					case 2:
					  g.stroke(50, s * 100 / r, 100); break;
				}
				g.beginShape();
				g.curveVertex(0, -s);
				for(let t = 0; t <= 10; t += 0.2){
			    let a = s * (0.8 + 0.2 * cos(t * Math.PI));
			    g.curveVertex(a * sin(t * Math.PI / 5), -a * cos(t * Math.PI / 5));
			  }
				g.curveVertex(0, -s);
				g.endShape();
			}
			g.translate(2 * r, 0);
		}
	}
	isActive(){
		return this.active;
	}
	isAlive(){
		return this.alive;
	}
	activate(){
		this.active = true;
		this.nonActiveFrameCount = 0;
	}
	inActivate(){
		this.active = false;
	}
	setPenetrate(flag){
		this.penetrate = flag;
	}
	getPenetrate(){
		return this.penetrate;
	}
	getLevel(){
		return this.level;
	}
	getDirection(){
		return this.direction;
	}
	kill(){
		//this.life--;
		this.alive = false;
	}
	setStatus(){
		this.speed = STATUS.speed[this.level];
		this.attack = STATUS.attack[this.level];
		this.rotationSpeed = STATUS.rotationSpeed[this.level];
	}
	hitWithBlock(_block){
		// LIFEUPでライフ回復。まあそのくらい。
		// ライフ無くなった。まあ、強制レベルアップの可能性あるし残しておこう。
	}
	hitWithPaddle(_paddle){
		// パドルがアクティブのときレベルアップ（ただし上限のときは反応無し）
		if(!_paddle.isActive()){ return; }
		if(this.level === 2){ return; }
		this.level++;
		this.poweredCount += 240;
		myMusic.playPowerupSound();
		this.setStatus();
	}
	initialize(){
		// 落ちてから復活するたびにこれをやる
		// 最終的にはガターにぶつかってパーティクルが出てそれが済んでからこれをやる。
		this.alive = true;
		this.level = 0;
		this.gr.resetMatrix();
		this.gr.translate(this.radius, this.radius);
		this.setStatus();
		this.active = false;
		this.nonActiveFrameCount = 0;
		this.poweredCount = 0;
		this.penetrate = false;
		this.rotationSpeed = 0.1;
		// ゴーストを消すため一瞬だけ画面外に消えてもらう。よくある処理。一瞬なので問題ない。
		this.x = -100;
		this.y = -100;
	}
	getNonActiveFrameCount(){
		return this.nonActiveFrameCount; // この値で方向をいじる
	}
	setPos(x, y){
		this.x = x;
		this.y = y;
	}
	setDirection(direction){
		this.direction = direction;
	}
	update(){
		if(!this.active){
			this.nonActiveFrameCount++;
			return;
		} // 位置も方向もこっちでは決めない
		if(this.poweredCount > 0){
			this.poweredCount--;
			if(this.poweredCount % 240 === 0){
				this.level--;
				this.setStatus();
			}
		}
		this.x += this.speed * cos(this.direction);
		this.y += this.speed * sin(this.direction);
		this.gr.rotate(this.rotationSpeed); // 回転スピードにより画像のrotateを行う
	}
	drawAura(gr){
		// オーラ描画
		gr.stroke(25 * this.level, 100, 100); // 25又は50
		gr.noFill();
		gr.strokeWeight(2);
		const barLength = (this.poweredCount % 240) * Math.PI * 2 / 240;
		gr.arc(this.x, this.y, this.radius * 4, this.radius * 4, -Math.PI / 2, -Math.PI / 2 + barLength);
		gr.noStroke();
	}
	draw(gr){
		// 画像は毎フレームListから引き出してきて描画する感じ
		const diam = this.radius * 2;
		this.gr.clear();
		this.gr.image(this.grList, -this.radius, -this.radius, diam, diam, diam * this.level, 0, diam, diam);
		gr.image(this.gr, this.x - this.radius, this.y - this.radius);
		if(this.level > 0){
      this.drawAura(gr);
		}
	}
}

// ----------------------------------------------------------------------------------- //
// paddle.

// 0～1のマウス値から位置を出す
class Paddle{
	constructor(){
	  this.ball = undefined;
		this.active = false; // active時は色が変わる. activeはクリックで切り替える。
		this.direction = 0; // lineとarcで若干違う感じ
		this.activeCount = 0; // 120フレーム
	}
	isActive(){
		return this.active;
	}
  activate(){
		if(this.active){ return; }
		this.active = true;
		this.activeCount = 120;
	}
	inActivate(){
		this.active = false;
	}
	setBall(_ball){
		this.ball = _ball;
	}
	removeBall(){
		this.ball = undefined;
	}
	updateBall(){}
	update(){
		if(this.active){
			this.activeCount--;
			if(this.activeCount === 0){
				this.inActivate();
			}
		}
	}
	drawPointer(gr){
		// いい加減矢印にしないとね。
		if(this.ball === undefined){ return; }
		gr.stroke(0, 0, 100);
		gr.strokeWeight(2);
		const d = this.ball.direction;
		const c = cos(d);
		const s = sin(d);
		const {x, y} = this.ball;
		const u = x + 40 * c;
		const v = y + 40 * s;
		const u1 = u + 10 * cos(d + PI * 5 / 6);
		const v1 = v + 10 * sin(d + PI * 5 / 6);
		const u2 = u + 10 * cos(d - PI * 5 / 6);
		const v2 = v + 10 * sin(d - PI * 5 / 6);
		gr.line(x + 10 * c, y + 10 * s, u, v);
		gr.line(u, v, u1, v1);
		gr.line(u, v, u2, v2);
		gr.noStroke();
	}
}

class LinePaddle extends Paddle{
	constructor(x1, x2, y1, y2, w, h, direction){
		super();
		this.xRange = [x1, x2];
		this.yRange = [y1, y2];
		this.x = -100;
		this.y = -100;
		this.w = w;
		this.h = h;
		this.direction = direction; // ボールが存在する方向（PI/2とか-PI/2とかそういうの）
		this.collider = new RectCollider(this.x, this.y, this.w, this.h);
	}
	move(mx, my){
		// mx, myは0～1の値でCANVAS_WやCANVAS_Hでconstrainされたマウス値でそれを元に位置を決める
		this.x = this.xRange[0] * (1 - mx) + this.xRange[1] * mx;
		this.y = this.yRange[0] * (1 - my) + this.yRange[1] * my;
		this.collider.update(this.x, this.y);
		// arcの場合ここでdirectionもいじる
	}
	updateBall(){
		if(this.ball === undefined){ return; }
		// ボール保持中にボールのdirectionと位置をいじるやつ
		const count = this.ball.getNonActiveFrameCount();
		const n = 2 * (abs(60 - (count % 120)) - 30);
		const ballDirection = this.direction + n * Math.PI / 180;
		this.ball.setDirection(ballDirection);
		this.ball.setPos(this.x + 0.5 * this.w + (0.5 * this.w + this.ball.radius) * cos(this.direction),
		                 this.y + 0.5 * this.h + (0.5 * this.h + this.ball.radius) * sin(this.direction));
	}
	draw(gr){
		if(this.active){ gr.fill(15, 100, 100); }else{ gr.fill(15, 0, 100); }
		gr.rect(this.x, this.y, this.w, this.h);
		this.drawPointer(gr);
	}
}

// アークパドル。(mx, my)に対しては(0.5, 0.5)を中心として角度を割り出しそれに基づいて位置を決める感じ
// directionFlagは1なら内向きで0なら外向き。0というのはつまり方向そのまんまって意味ね。1の場合はPIを足すと。
// 厚さ4の円弧。描画はラインでやる。
// めんどくさいからまた今度ね
class ArcPaddle extends Paddle{
	constructor(cx, cy, r, w, directionFlag){
		super();
		this.cx = cx;
		this.cy = cy;
		this.r = r;
		this.w = w;
		// t1とt2は端っこの角度の値です
		this.t1 = -w * 0.5 / r;
		this.t2 = w * 0.5 / r;
		this.directionFlag = directionFlag; // 内向きか外向きかって話. 0なら外向き、1なら内向き。これのPI倍を足せばいい。
		this.direction = directionFlag * Math.PI;
		// パドルなので4で固定ね
		this.collider = new ArcCollider(this.cx, this.cy, this.r, w);
	}
	move(mx, my){
		// まず(0.5, 0.5)を中心とする方向を割り出す
		const t = atan2(my - 0.5, mx - 0.5);
		this.t1 = t - this.w * 0.5 / this.r;
		this.t2 = t + this.w * 0.5 / this.r;
		this.direction = t + this.directionFlag * Math.PI;
		this.collider.update(this.t1, this.t2);
	}
	updateBall(){
		if(this.ball === undefined){ return; }
		// ボール保持中にボールのdirectionと位置をいじるやつ
		const count = this.ball.getNonActiveFrameCount();
		const n = 2 * (abs(60 - (count % 120)) - 30);
		const ballDirection = this.direction + n * Math.PI / 180;
		this.ball.setDirection(ballDirection);
		const sgn = (this.directionFlag === 0 ? 1 : -1);
		const cr = this.r + sgn * (this.ball.radius + 2);
		// フラグ補正忘れずに
		this.ball.setPos(this.cx + cr * Math.cos(this.direction + this.directionFlag * Math.PI),
		                 this.cy + cr * Math.sin(this.direction + this.directionFlag * Math.PI));
	}
	draw(gr){
		// t1からt2まで描画する
		if(this.active){ gr.stroke(15, 100, 100); }else{ gr.stroke(15, 0, 100); }
		gr.noFill();
		gr.strokeWeight(4);
		gr.arc(this.cx, this.cy, this.r * 2, this.r * 2, this.t1, this.t2);
	  gr.noStroke();
		this.drawPointer(gr);
	}
}

// ----------------------------------------------------------------------------------- //
// block.
// 種類を増やすなら継承使わないといけないかも。
// 斜めのブロック導入するならどうしてもね・・まあ導入しないなら関係ないか。やめよう。時間ねぇし。

// NORMALとLIFEUPとWALL. まあとりあえずWALLかな
// さすがにもうグラフィックでいいかなって気がしてきた。多くなるとどうしてもね。
class Block{
	constructor(gridX, gridY, gridW, gridH, blockType = WALL, tough = Infinity, hue = 0){
		this.x = gridX * GRIDSIZE;
		this.y = gridY * GRIDSIZE;
		this.w = gridW * GRIDSIZE;
		this.h = gridH * GRIDSIZE;
		this.blockType = blockType;
		this.tough = tough;
		this.hue = hue;
		this.alive = true;
		this.collider = new RectCollider(this.x, this.y, this.w, this.h);
		this.gr = createGraphics(this.w, this.h);
		this.gr.noStroke();
		this.gr.colorMode(HSB, 100);
		this.hasChild = false; // これをtrueにしてブロック排除の際にtrueにする
		this.drawBlockImage();
	}
	getId(){
		// パーティクル出力用のidを返す関数
		switch(this.blockType){
			case NORMAL:
			  return this.tough - 1; // toughは1,2,3,4,5であることが前提
			//case LIFEUP:
			//  return 5;
			case WALL:
			  return 6;
		}
	}
	drawBlockImage(){
		this.gr.clear();
		switch(this.blockType){
			case NORMAL:
			  Block.normalDraw(this.gr, this.w, this.h, BLOCK_HUE[this.tough - 1]);
				break;
			//case LIFEUP:
			//  Block.normalDraw(this.gr, this.w, this.h, 88);
				// ハートマーク描こうね
			//	Block.drawHeart(this.gr, this.w * 0.5, this.h * 0.55);
			//	break;
			case WALL:
			  Block.wallDraw(this.gr, this.w, this.h);
				break;
		}
	}
	isAlive(){
		return this.alive;
	}
	kill(){
		this.alive = false;
	}
	hitWithBall(_ball){
		if(this.tough > 2 && _ball.attack < 2){ return; }
		// タフネス1でダメージも1でかつwもhもGRIDSIZEx2以上の大きさの時に限り分裂. NORMALでもLIFEUPでも。
		// LIFEUPの場合は上手くすれば5UPできるというわけ
		if(this.tough === 1 && _ball.attack === 1 && this.w > GRIDSIZE && this.h > GRIDSIZE){ this.hasChild = true; }
		if(this.tough + 2 <= _ball.attack){
			_ball.setPenetrate(true);
		}
		this.tough = max(0, this.tough - _ball.attack);
		if(this.tough === 0){ this.kill(); return; }
		// returnしないと実行されちゃうでしょこの馬鹿！！！！！！
		this.drawBlockImage(); // killの後に描かないとエラーになる。当たり前。
	}
	draw(gr){
		gr.image(this.gr, this.x, this.y);
	}
	static normalDraw(gr, w, h, hue){
		gr.fill(hue, 50, 100);
		gr.rect(0, 0, w, h);
		gr.fill(hue, 100, 50);
		gr.rect(1, 1, w - 1, h - 1);
		gr.fill(hue, 100, 100);
		gr.rect(1, 1, w - 2, h - 2);
	}
	static wallDraw(gr, w, h){
		gr.clear();
		gr.fill(75);
		gr.rect(0, 0, w, h);
		gr.fill(25);
		gr.rect(1, 1, w - 1, h - 1);
		gr.fill(50);
		gr.rect(1, 1, w - 2, h - 2);
	}
}

// RingWallはもう別に用意した方がいいと思う。で、当たり判定はブロックと一緒に用意する。
class RingWall{
	constructor(cx, cy, r1, r2){
		this.cx = cx;
		this.cy = cy;
		this.rmin = min(r1, r2);
		this.rmax = max(r1, r2);
		this.gr = createGraphics(this.rmax * 2, this.rmax * 2);
		this.collider = new RingCollider(cx, cy, r1, r2);
		this.ringDraw();
	}
	ringDraw(){
		this.gr.noStroke();
		this.gr.fill(128);
		this.gr.circle(this.rmax, this.rmax, this.rmax * 2);
		this.gr.erase();
		this.gr.circle(this.rmax, this.rmax, this.rmin * 2);
		this.gr.noErase();
	}
	draw(gr){
		gr.image(this.gr, this.cx - this.rmax, this.cy - this.rmax);
	}
}

// ----------------------------------------------------------------------------------- //
// gutter.

// colliderデータを受け取ってそれをもとにgrに描画してベースラインとする、そのうえで当たり判定を提供する流れ。
// glsl使って描画するのもありなんかなとか思ったり
class Gutter{
	constructor(){
		this.gr = undefined;
		this.grLava = undefined;
		this.lavaShader = undefined;
		this.colliders = [];
	}
	setting(w, h, colliders){
		this.gr = createGraphics(w, h);
		this.gr.noStroke();
		this.gr.fill(0);
		this.gr.colorMode(HSB, 100);
		this.colliders = colliders;
		this.grLava = createGraphics(w, h, WEBGL);
		this.lavaShader = this.grLava.createShader(vsLava, fsLava);
		this.grLava.shader(this.lavaShader);
		this.lavaShader.setUniform("u_resolution", [w, h]);
		this.lavaShader.setUniform("u_time", Math.random() * 999);
		this.grLava.quad(-1, -1, -1, 1, 1, 1, 1, -1);
		for(let c of this.colliders){
			switch(c.type){
				case "rect":
				  this.gr.push();
					this.gr.rect(c.x, c.y, c.w, c.h);
					this.gr.drawingContext.clip();
					this.gr.image(this.grLava, 0, 0);
					this.gr.pop();
					break;
				case "ring":
				  this.gr.push();
					this.gr.circle(c.cx, c.cy, c.rmax * 2);
					this.gr.drawingContext.clip();
					this.gr.image(this.grLava, 0, 0);
					this.gr.pop();
					this.gr.erase();
					this.gr.circle(c.cx, c.cy, c.rmin * 2);
					this.gr.noErase();
					break;
			}
		}
	}
	check(_ball){
		// 当たり判定
		// optionをfalseにして速度を足さないようにする
		for(let c of this.colliders){ if(c.collideWithBall(_ball, false)){ return true; } }
		return false;
	}
	draw(gr){
		gr.image(this.gr, 0, 0);
	}
}

// ----------------------------------------------------------------------------------- //
// Collider.
// コリダーのアークを廃止してskewrectを導入してパドルもskewパドルにしてアークパドル廃止する流れ。

// collideの処理は現在の位置に速度を足したものについて行なう。そこだけ注意。
class Collider{
	constructor(){
		this.type = "";
	}
	collideWithBall(_ball){}
	reflect(_ball){}
}

// 長方形。ガターとパドルとブロックで使う感じ
// ボールに関してはrectしたりcircleしたりなので別扱いで。
class RectCollider extends Collider{
	constructor(x, y, w, h){
		super();
		this.type = "rect";
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}
	update(x, y){
		this.x = x;
		this.y = y;
	}
	collideWithBall(_ball, post = true){
		// 速度を足す。
		// postは速度を足すかどうかって話。ガターでは足さないので。
		const d = _ball.direction;
		const coeff = (post ? 1 : 0);
		const bx = _ball.x + coeff * _ball.speed * cos(d);
		const by = _ball.y + coeff * _ball.speed * sin(d);
		// ぶつかるかどうか調べてtrueかfalseを返すだけ。
		if(this.x + this.w < bx - _ball.radius || bx + _ball.radius < this.x){ return false; }
		if(this.y + this.h < by - _ball.radius || by + _ball.radius < this.y){ return false; }
		return true;
	}
	reflect(_ball){
		// ぶつかる場合に速度を変える
		// 使うのは速度を足す前の位置ですね（python版そうなってる）
		const d = _ball.direction;
		const bx = _ball.x;
		const by = _ball.y;
		const cx = this.x + this.w * 0.5;
		const cy = this.y + this.h * 0.5;
		if(abs(bx - cx) < this.w * 0.5){ _ball.setDirection(-d); return; }
		if(abs(by - cy) < this.h * 0.5){ _ball.setDirection(Math.PI - d); return; }
		let mainDirection;
		if(bx > cx && by > cy){ mainDirection = Math.PI / 4; }
		if(bx < cx && by > cy){ mainDirection = Math.PI * 3 / 4; }
		if(bx < cx && by < cy){ mainDirection = Math.PI * 5 / 4; }
		if(bx > cx && by < cy){ mainDirection = Math.PI * 7 / 4; }
		_ball.setDirection(mainDirection + (Math.random() * 2 - 1) * Math.PI / 12);
	}
}

// 斜めrectのCollider.
// cx,cyは中心、directionは方向、wはdirection方向の長さ、hはdirectionを時計回り90°回転させた方向の長さ。
// あえて半分にはしない・・パドルに使うこと考えるとね。
class SkewRectCollider extends Collider{
	constructor(cx, cy, w, h, direction){
		super();
		this.cx = cx;
		this.cy = cy;
		this.w = w;
		this.h = h;
		this.direction = dir;
	}
	update(cx, cy, direction){
		this.cx = cx;
		this.cy = cy;
		this.direction = direction;
	}
	CollideWithBall(_ball, post = true){
		// ボールをこっちのdirectionに平行な正方形とみなして衝突判定する
		// postは速度を足すかどうかって話。ガターでは足さないので。
		const d = _ball.direction;
		const r = _ball.radius;
		const coeff = (post ? 1 : 0);
		const bx = _ball.x + coeff * _ball.speed * cos(d);
		const by = _ball.y + coeff * _ball.speed * sin(d);
		const bx1 = bx - this.cx;
		const by1 = by - this.cy;
		const dir = this.direction;
		const u = bx1 * Math.cos(dir) + by1 * Math.sin(dir);
		const v = -bx1 * Math.sin(dir) + by1 * Math.cos(dir);
		if(this.w * 0.5 < u - r || u + r < this.w * 0.5){ return false; }
		if(this.h * 0.5 < v - r || v + r < this.h * 0.5){ return false; }
		return true;
	}
	reflect(_ball){
		// ぶつかる場合は速度を変える
	}
}

// 厚みが必要。バームクーヘン的な。パドル専用。厚みは4で固定・・んー。
// なくす。まあ、うん、なくす。
class ArcCollider extends Collider{
  constructor(cx, cy, r, w){
		super();
		this.type = "arc";
		this.cx = cx;
		this.cy = cy;
		this.r = r;
    this.w = w;
		this.h = 4; // 厚み
		this.t1 = -w * 0.5 / r;
		this.t2 = w * 0.5 / r;
	}
	update(t1, t2){
		this.t1 = t1;
		this.t2 = t2;
	}
	collideWithBall(_ball, post = true){
		// 速度を足す。
		const d = _ball.direction;
		const coeff = (post ? 1 : 0);
		const bx = _ball.x + coeff * _ball.speed * cos(d);
		const by = _ball.y + coeff * _ball.speed * sin(d);
		// ボールの中心の方向がt1-diff～t2+diffの範囲内にあるか調べる。
		// diffはthis.l/2に相当する長さの角度のずれ、要するにthis.l / (2 * this.r)ね。
		// あったとして、今度は中心からの距離を取り、this.rとの差が、絶対値が、厚さの半分と半径の和より大きいならfalse.
		// 扇形はそれほど大きいものを想定していないので範囲内かどうかについてはcosの値で判定すればOK.
		const diff = this.h / (2 * this.r);
		const ballDir = atan2(by - this.cy, bx - this.cx);
		if(Math.cos(ballDir - diff - (this.t1 + this.t2) * 0.5) < Math.cos(diff + (this.t2 - this.t1) * 0.5)){ return false; }
		const ballDistance = dist(bx, by, this.cx, this.cy);
		if(abs(ballDistance - this.r) > this.h * 0.5 + _ball.radius){ return false; }
		return true;
	}
	reflect(_ball){
		// 中心がdiffの内側なら普通に反射する感じ。
		// はじっこはやめましょう。
		// constrainしてなるべく中央側に出るようにしようかな（内積でぶつかる方向を割り出して）
		const d = _ball.direction;
		const bx = _ball.x;
		const by = _ball.y;
		const diff = this.h / (2 * this.r);
		const ballDir = atan2(by - this.cy, bx - this.cx);
		//const ballDistance = dist(bx, by, this.cx, this.cy); // 使ってない
		// diffの内側なので反射. いずれにせよballDirを中心として反対側に。
		let v = createVector(_ball.speed * Math.cos(d), _ball.speed * Math.sin(d));
		let n = p5.Vector.fromAngle(ballDir);
		let u = p5.Vector.sub(v, p5.Vector.mult(n, 2 * p5.Vector.dot(v, n))); // 2を掛けてたよ・・multの引数にしないとね。
		_ball.setDirection(u.heading());
	}
}

// 円環も用意するか。これはガター専用。処理が煩雑になるので分ける。
class RingCollider extends Collider{
	constructor(cx, cy, r1, r2){
		super();
		this.type = "ring";
		this.cx = cx;
		this.cy = cy;
		this.rmin = min(r1, r2);
		this.rmax = max(r1, r2);
	}
	collideWithBall(_ball){
		const ballDistance = dist(_ball.x, _ball.y, this.cx, this.cy);
		if(ballDistance - _ball.radius > this.rmax || ballDistance + _ball.radius < this.rmin){ return false; }
		return true;
	}
	reflect(_ball){
		// RingWallを作りたいので。これもよろしく～基本的にはパドルと一緒ですね。
		const d = _ball.direction;
		const bx = _ball.x;
		const by = _ball.y;
		const ballDir = atan2(by - this.cy, bx - this.cx);
		let v = createVector(_ball.speed * Math.cos(d), _ball.speed * Math.sin(d));
		let n = p5.Vector.fromAngle(ballDir);
		let u = p5.Vector.sub(v, p5.Vector.mult(n, 2 * p5.Vector.dot(v, n)));
		_ball.setDirection(u.heading());
	}
}

// ----------------------------------------------------------------------------------- //
// drawFunction.
// particle描画用の関数

function drawTriangle(x, y, radius, rotationAngle, shapeColor, gr){
	// (x, y)を中心とする三角形、radiusは重心から頂点までの距離。
	let p = [];
	for(let i = 0; i < 3; i++){
		p.push({x:x + radius * cos(rotationAngle + PI * i * 2 / 3), y:y + radius * sin(rotationAngle + PI * i * 2 / 3)});
	}
	gr.fill(shapeColor);
	gr.triangle(p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y);
}

function drawSquare(x, y, radius, rotationAngle, shapeColor, gr){
	// (x, y)を中心とする正方形、radiusは重心から頂点までの距離。
	let p = [];
	for(let i = 0; i < 4; i++){
		p.push({x:x + radius * cos(rotationAngle + PI * i * 2 / 4), y:y + radius * sin(rotationAngle + PI * i * 2 / 4)});
	}
	gr.fill(shapeColor);
	gr.quad(p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y, p[3].x, p[3].y);
}

function drawStar(x, y, radius, rotationAngle, shapeColor, gr){
	// (x, y)を中心としdirection方向にradius離れててstarColorで塗りつぶしてやる感じ
	// radiusは外接円の半径
	let p = [];
	for(let i = 0; i < 5; i++){
		p.push({x:x + radius * cos(rotationAngle + 2 * PI * i / 5), y:y + radius * sin(rotationAngle + 2 * PI * i / 5)});
	}
	const shortLength = radius * sin(PI / 10) / cos(PI / 5);
	for(let i = 0; i < 5; i++){
		p.push({x:x - shortLength * cos(rotationAngle + 2 * PI * i / 5), y:y - shortLength * sin(rotationAngle + 2 * PI * i / 5)});
	}
	gr.fill(shapeColor);
	gr.triangle(p[1].x, p[1].y, p[8].x, p[8].y, p[9].x, p[9].y);
	gr.triangle(p[4].x, p[4].y, p[6].x, p[6].y, p[7].x, p[7].y);
	gr.quad(p[0].x, p[0].y, p[2].x, p[2].y, p[5].x, p[5].y, p[3].x, p[3].y);
}

function drawCross(x, y, radius, rotationAngle, shapeColor, gr){
  // なんかquad4つのやつ
	let p = [];
	for(let i = 0; i < 4; i++){
		p.push({x:x + radius * cos(rotationAngle + PI * i / 2), y:y + radius * sin(rotationAngle + PI * i / 2)});
	}
	for(let i = 0; i < 4; i++){
		p.push({x:x + radius * 0.3 * cos(rotationAngle + PI * (i + 0.5) / 2), y:y + radius * 0.3 * sin(rotationAngle + PI * (i + 0.5) / 2)});
	}
	gr.fill(shapeColor);
	gr.quad(x, y, p[4].x, p[4].y, p[0].x, p[0].y, p[7].x, p[7].y);
	gr.quad(x, y, p[5].x, p[5].y, p[1].x, p[1].y, p[4].x, p[4].y);
	gr.quad(x, y, p[6].x, p[6].y, p[2].x, p[2].y, p[5].x, p[5].y);
	gr.quad(x, y, p[7].x, p[7].y, p[3].x, p[3].y, p[6].x, p[6].y);
}

// ハート描きたいね
// 円2つとquad2つあればいける
function drawHeart(x, y, radius, rotationAngle, shapeColor, gr){
/* 工事中 */
}


// ----------------------------------------------------------------------------------- //
// Particle and ParticleSystem.
// ボールが消滅するときのエフェクト。

class Particle{
	constructor(x, y, particleHue){
		this.center = {};
	}
	initialize(x, y, direction, baseColor, drawFunction, sizeFactor, hopFlag){
		this.center.x = x;
		this.center.y = y;
		this.direction = direction; // 方向指定
	  this.finalDistance = random(MIN_DISTANCE, MAX_DISTANCE);
		this.life = PARTICLE_LIFE; // 寿命は固定しよう。
		this.color = baseColor;
		this.rotationAngle = random(2 * PI); // 回転の初期位相
		this.radius = random(MIN_RADIUS, MAX_RADIUS) * sizeFactor; // 本体の半径. 6～24がデフォで、大きさをsizeFactorで調整する。
		this.alive = true;
		this.drawFunction = drawFunction;
		this.hop = hopFlag;
	}
	kill(){
		this.alive = false;
	}
	update(){
		this.life--;
		this.rotationAngle += PARTICLE_ROTATION_SPEED;
		if(this.life === 0){ this.kill(); }
	}
	draw(gr){
		let prg = (PARTICLE_LIFE - this.life) / PARTICLE_LIFE;
		prg = sqrt(prg * (2 - prg));
		//const particleColor = color(this.colorData.r, this.colorData.g, this.colorData.b, 255 * (1 - prg));
		this.color.setAlpha(255 * (1 - prg));
		let x = this.center.x + this.finalDistance * prg * cos(this.direction);
		let y = this.center.y + this.finalDistance * prg * sin(this.direction);
		if(this.hop){
			// ぽ～ん効果
			y -= prg * (1 - prg) * 4.0 * this.finalDistance * 0.5;
		}
    this.drawFunction(x, y, this.radius, this.rotationAngle, this.color, gr);
	}
	remove(){
		if(this.alive){ return; }
		this.belongingArray.remove(this);
		particlePool.recycle(this);
	}
}

// クリックするとその位置にパーティクルが出現するようにしたいのです。うん。
// デモじゃないのでそれはありえません（ごめんね）
class ParticleSystem{
	constructor(){
		this.particleArray = new CrossReferenceArray();
		//this.directionRange = [0, 2 * PI]; // ここをいじると色んな方向にとびだす
		//this.lifeFactor = 1.0;
		//this.sizeFactor = 1.0;
		//this.hop = false; // particleが放物線を描くかどうか。デフォはまっすぐ。
		this.gr = undefined; // 画像
	}
	isEmpty(){
		// isEmptyかどうかで遷移すべきか否かの条件とする
		return this.particleArray.isEmpty();
	}
	setGraphic(w, h){
		// 画像のサイズを含めた初期化
		this.gr = createGraphics(w, h);
		this.gr.noStroke();
	}
	createParticle(x, y, baseColor, drawFunction, particleNum, sizeFactor = 1.0, hopFlag = false, minDirection = 0, maxDirection = 2 * PI){
		for(let i = 0; i < particleNum; i++){
			let ptc = particlePool.use();
			// 一応基本は[0, 2 * PI]で。特定方向に出す場合も考慮・・
			const direction = random(minDirection, maxDirection);
			ptc.initialize(x, y, direction, baseColor, drawFunction, sizeFactor, this.hop);
			this.particleArray.add(ptc);
		}
	}
	update(){
		this.particleArray.loop("update");
	}
	draw(gr){
		// 特定のグラフィックに描画させたい
		this.gr.clear();
		this.particleArray.loop("draw", [this.gr]);
		gr.image(this.gr, 0, 0);
	}
	remove(){
		this.particleArray.loopReverse("remove");
	}
	removeAll(){
		// 全部リセット
		for(let p of this.particleArray){ p.kill(); }
		this.remove();
	}
}

// ----------------------------------------------------------------------------------- //
// ObjectPool.
// particleを出すためのプール

class ObjectPool{
	constructor(objectFactory = (() => ({})), initialCapacity = 0){
		this.objPool = [];
		this.nextFreeSlot = null; // 使えるオブジェクトの存在位置を示すインデックス
		this.objectFactory = objectFactory;
		this.grow(initialCapacity);
	}
	use(){
		if(this.nextFreeSlot == null || this.nextFreeSlot == this.objPool.length){
		  this.grow(this.objPool.length || 5); // 末尾にいるときは長さを伸ばす感じ。lengthが未定義の場合はとりあえず5.
		}
		let objToUse = this.objPool[this.nextFreeSlot]; // FreeSlotのところにあるオブジェクトを取得
		this.objPool[this.nextFreeSlot++] = EMPTY_SLOT; // その場所はemptyを置いておく、そしてnextFreeSlotを一つ増やす。
		return objToUse; // オブジェクトをゲットする
	}
	recycle(obj){
		if(this.nextFreeSlot == null || this.nextFreeSlot == -1){
			this.objPool[this.objPool.length] = obj; // 図らずも新しくオブジェクトが出来ちゃった場合は末尾にそれを追加
		}else{
			// 考えづらいけど、this.nextFreeSlotが0のときこれが実行されるとobjPool[-1]にobjが入る。
			// そのあとでrecycleが発動してる間は常に末尾にオブジェクトが増え続けるからFreeSlotは-1のまま。
			// そしてuseが発動した時にその-1にあったオブジェクトが使われてそこにはEMPTY_SLOTが設定される
			this.objPool[--this.nextFreeSlot] = obj;
		}
	}
	grow(count = this.objPool.length){ // 長さをcountにしてcount個のオブジェクトを追加する
		if(count > 0 && this.nextFreeSlot == null){
			this.nextFreeSlot = 0; // 初期状態なら0にする感じ
		}
		if(count > 0){
			let curLen = this.objPool.length; // curLenはcurrent Lengthのこと
			this.objPool.length += Number(count); // countがなんか変でも数にしてくれるからこうしてるみたい？"123"とか。
			// こうするとかってにundefinedで伸ばされるらしい・・長さプロパティだけ増やされる。
			// 基本的にはlengthはpushとか末尾代入（a[length]=obj）で自動的に増えるけどこうして勝手に増やすことも出来るのね。
			for(let i = curLen; i < this.objPool.length; i++){
				// add new obj to pool.
				this.objPool[i] = this.objectFactory();
			}
			return this.objPool.length;
		}
	}
	size(){
		return this.objPool.length;
	}
}

// ----------------------------------------------------------------------------------- //
// CrossReferenceArray.
// particleを格納するための配列。

class CrossReferenceArray extends Array{
	constructor(){
    super();
	}
  add(element){
    this.push(element);
    element.belongingArray = this; // 所属配列への参照
  }
	isEmpty(){
		// 空っぽかどうか
		return this.length === 0;
	}
  remove(element){
    let index = this.indexOf(element, 0);
    this.splice(index, 1); // elementを配列から排除する
  }
  loop(methodName, args = undefined){
		// argsは引数配列。指定しなければ普通に引数無しで実行される
		if(this.length === 0){ return; }
    // methodNameには"update"とか"display"が入る。まとめて行う処理。
		for(let i = 0; i < this.length; i++){
			if(args === undefined){
			  this[i][methodName]();
			}else{
				this[i][methodName](...args);
			}
		}
  }
	loopReverse(methodName){
		if(this.length === 0){ return; }
    // 逆から行う。排除とかこうしないとエラーになる。もうこりごり。
		for(let i = this.length - 1; i >= 0; i--){
			this[i][methodName]();
		}
  }
	clear(){
		this.length = 0;
	}
}

// ----------------------------------------------------------------------------------- //
// interaction.

function keyPressed(){
  mySystem.currentState.keyAction(keyCode);
	return false;
}

function mouseClicked(){
	mySystem.currentState.clickAction();
	return false;
}
