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

// KEYCODE定数
const K_ENTER = 13;
const K_RIGHT = 39;
const K_LEFT = 37;
const K_UP = 38;
const K_DOWN = 40;
const K_SPACE = 32;

// ライフ
const LIFES = [3, 5, 10, 15];
// ステータス
const STATUS = {speed:[4, 6, 7], attack:[1, 2, 3]};
// パドル長
const PADDLE_LENGTH = [80, 60, 40, 30];
// ブロックヒュー
const BLOCK_HUE = [18, 10, 0, 78, 65];
// ブロックやボールが壊れるときの色パレット（黄色、オレンジ、赤、紫、青、ピンク、灰色、ライム）
const BREAK_PALETTE = ["#fff000", "#ffa500", "#ff0000", "#800080", "#0000cd", "#ff1493", "#888", "lime"];
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
const LIFEUP = 1;
const WALL = 2;

// particle関連
// 色に関してはパレットを使ってRGBでやってるっぽいので
// パーティクル専用のgr作ってそこに全部描いて乗せる方法で行くか
let particlePool;
const EMPTY_SLOT = Object.freeze(Object.create(null)); // ダミーオブジェクト

const PARTICLE_LIFE = 60; // 寿命
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
	const codeNames = ["C", "D", "E", "F", "G", "A", "B", "C2", "D2", "E2", "F2", "G2", "A2", "B2"];
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
		              pause:new Pause(this), gameover:new Gameover(this), clear:new Clear(this)};
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
		this.level = 0;
		this.mode = 0;
		this.levelSpace = createGraphics(80 + 440, 40);
		this.modeSpace = createGraphics(70 + 350, 40);
		this.playButton = createGraphics(120, 60);
		this.drawPrepare();
	}
	drawNonActiveButton(gr, x, y, txt){
		gr.fill(50);
		gr.triangle(x, y, x + 80, y, x, y + 40);
		gr.fill(25);
		gr.triangle(x + 80, y, x, y + 40, x + 80, y + 40);
		gr.fill(75);
		gr.rect(x + 8, y + 4, 64, 32);
		gr.fill(0);
		gr.text(txt, x + 40, y + 20);
	}
	drawActiveButton(gr, x, y, txt, hue){
		gr.fill(hue, 50, 100);
		gr.triangle(x, y, x + 80, y, x, y + 40);
		gr.fill(hue, 100, 50);
		gr.triangle(x + 80, y, x, y + 40, x + 80, y + 40);
		gr.fill(hue, 100, 100);
		gr.rect(x + 8, y + 4, 64, 32);
		gr.fill(0);
		gr.text(txt, x + 40, y + 20);
	}
  drawPrepare(){
		this.gr.textFont(huiFont);
		this.gr.textAlign(CENTER, CENTER);
		this.gr.fill(0);
    ordinaryPrepare([this.levelSpace, this.modeSpace, this.playButton]);
		this.drawLevelButtons();
		this.drawModeButtons();
		this.drawPlayButton();
	}
	drawLevelButtons(){
		this.levelSpace.clear();
		for(let i = 0; i < 5; i++){
			if(i === this.level){
				this.drawActiveButton(this.levelSpace, 80 + 90 * i, 0, "Lv." + i, 20);
			}else{
				this.drawNonActiveButton(this.levelSpace, 80 + 90 * i, 0, "Lv." + i);
			}
		}
		this.levelSpace.fill(0);
		this.levelSpace.text("LEVEL:", 40, 20);
	}
	drawModeButtons(){
		this.modeSpace.clear();
		for(let i = 0; i < 4; i++){
			if(i === this.mode){
				this.drawActiveButton(this.modeSpace, 70 + 90 * i, 0, MODE_TEXT[i], MODE_HUE[i]);
			}else{
				this.drawNonActiveButton(this.modeSpace, 70 + 90 * i, 0, MODE_TEXT[i]);
			}
		}
		this.modeSpace.fill(0);
		this.modeSpace.text("MODE:", 35, 20);
	}
	drawPlayButton(){
		this.playButton.textSize(48);
		this.playButton.fill(0, 50, 100);
		this.playButton.triangle(0, 0, 120, 0, 0, 60);
		this.playButton.fill(0, 100, 50);
		this.playButton.triangle(120, 0, 0, 60, 120, 60);
		this.playButton.fill(0, 100, 100);
		this.playButton.rect(12, 6, 96, 48);
		this.playButton.fill(0);
		this.playButton.text("play", 60, 24);
	}
	prepare(_state){
		// いろいろリセットしないとダメ
		this.level = 0;
		this.mode = 0;
		this.drawLevelButtons();
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
		if(mx > 220 && mx < 660 && my > 300 && my < 340){
			if((mx - 220) % 90 > 80){ return; }
			const newLevel = Math.floor((mx - 220) / 90);
			if(newLevel !== this.level){
				this.level = newLevel;
				myMusic.playDecisionSound();
			}
			this.drawLevelButtons();
		}
		if(mx > 260 && mx < 610 && my > 400 && my < 440){
			if((mx - 260) % 90 > 80){ return; }
			const newMode = Math.floor((mx - 260) / 90);
			if(newMode !== this.mode){
				this.mode = newMode;
				myMusic.playDecisionSound();
			}
			this.drawModeButtons();
		}
		if(mx > 340 && mx < 460 && my > 505 && my < 565){
			this.setNextState("play");
			myMusic.playDecisionSound();
		}
	}
	update(){}
	draw(){
		this.gr.background(200, 200, 255);
		this.gr.textSize(80);
		this.gr.text("BLOCKBREAK", 400, 80);
		this.gr.textSize(40);
		this.gr.text("PRESS ENTER KEY", 400, 170);
		this.gr.text("(OR CLICK PLAY BUTTON)", 400, 220);
		this.gr.image(this.levelSpace, 400 - 40 - 220, 320 - 20);
		this.gr.image(this.modeSpace, 400 - 35 - 175, 420 - 20);
		this.gr.image(this.playButton, 400 - 60, 520 - 15);
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
		this.level = 0;
		this.stage = 0;
		this.offSet = {}; // ゲームシステム側のグラフィックを表示する際のオフセット
		this.preAnimationSpan = 60;
		this.drawPrepare();
	}
	drawPrepare(){
		this.gr.noStroke();
		this.gr.textSize(64);
		this.gr.textAlign(CENTER, CENTER);
		this.gr.textFont(huiFont);
	}
  prepare(_state){
		switch(_state.name){
			case "pause":
			  return;
			case "title":
			  this.gameSystem.initialize(_state.mode); // 1を引くって感じで。mode（難易度）設定。
				this.level = _state.level; // レベル番号要るかな・・んー
				this.stage = 0; // ステージ番号リセット
				break;
		}
		this.gameSystem.setPattern(this.level, this.stage); // レベルとステージは両方必要
		this.offSet = this.gameSystem.getOffSet(); // オフセットを計算する

		this.preAnimationSpan = 60; // 0になるまでいろいろキャンセルしてステージ番号を表示
  }
  keyAction(code){
		// シフトキーでボールの位置が変わるかも
		// スペースキーでポーズ
		if(code === K_SPACE){
			this.setNextState("pause");
		}
	}
	clickAction(){
		this.gameSystem.clickAction();
	}
	update(){
		if(this.preAnimationSpan > 0){
			this.preAnimationSpan--;
			return;
		}

		this.gameSystem.update();

		// ゲームオーバーにするか否かの処理。trueを返したらゲームオーバーに移行する
		if(this.gameSystem.gameoverCheck()){
			this.setNextState("gameover");
		}
		// クリアにする。true返したら、ステージ番号増やす。5になったらplayに戻さずにタイトルへ。
		if(this.gameSystem.clearCheck()){
			this.stage++;
			this.setNextState("clear");
		}
	}
	showPreAnimation(){
		this.gr.background(0);
		this.gr.fill(255);
		this.gr.text("STAGE " + this.level + "-" + this.stage, CANVAS_W * 0.5, CANVAS_H * 0.5);
		image(this.gr, 0, 0);
	}
	draw(){
		if(this.preAnimationSpan > 0){
			this.showPreAnimation();
			return;
		}
		this.gameSystem.draw(); // システム側のdraw.
		this.gr.background(128);
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
		this.gr.text("---PAUSE---", CANVAS_W * 0.5, CANVAS_H * 0.46);
		this.gr.text("PRESS SPACE KEY", CANVAS_W * 0.5, CANVAS_H * 0.54);
  }
  keyAction(code){
		if(code === K_SPACE){
			this.setNextState("play");
		}
	}
	clickAction(){} // マウスクリックイベント
	update(){}
	draw(){
		image(this.gr, 0, 0);
	}
}

// ゲームオーバーについてはPlayの画像を借りつつちょっと薄暗くして中央に文字描いて終わり的な。
// テトリスのようなアニメは無くって文字だけ。エンターキーで戻る。
// Playからしか来ない。
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
		this.gr.text("PRESS ENTER KEY", CANVAS_W * 0.5, CANVAS_H * 0.54);
  }
  keyAction(code){
		if(code === K_ENTER){
			this.setNextState("title");
		}
	} // キーイベント
	clickAction(){} // マウスクリックイベント
	update(){}
	draw(){
		image(this.gr, 0, 0);
	}
}

// Playから来る。stageを読み取り、5より小さいならPlayに戻して次のステージを用意する。
class Clear extends State{
	constructor(_node){
		super(_node);
		this.name = "clear";
		this.allClearFlag = false;
		this.gr.fill(255);
		this.gr.textFont(huiFont);
		this.gr.textSize(CANVAS_H * 0.08);
		this.gr.textAlign(CENTER, CENTER);
	}
	drawPrepare(){} // 準備描画（最初に一回だけやる）
  prepare(_state){
		this.allClearFlag = (_state.stage < 5 ? false : true);
		this.gr.image(_state.gr, 0, 0);
		this.gr.background(0, 128);
		if(this.allClearFlag){
			this.gr.text("STAGE ALL CLEAR!", CANVAS_W * 0.5, CANVAS_H * 0.46);
			this.gr.text("PRESS ENTER KEY", CANVAS_W * 0.5, CANVAS_H * 0.54);
		}else{
			this.gr.text("STAGE CLEAR!", CANVAS_W * 0.5, CANVAS_H * 0.46);
			this.gr.text("PRESS ENTER KEY", CANVAS_W * 0.5, CANVAS_H * 0.54);
		}
	}
  keyAction(code){
		if(code === K_ENTER){
			if(this.allClearFlag){
				this.setNextState("title");
			}else{
				this.setNextState("play");
			}
		}
	} // キーイベント
	clickAction(){} // マウスクリックイベント
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
		this.score = 0;
		this.mode = 0;
		this.gutter = new Gutter(); // ガター
		this.blocks = []; // ブロック
		this.paddles = []; // パドル
		this.ball = new Ball(); // ボール
		this.currentPaddleId = -1; // ボールが属するパドルのid. シフトキーで移動させるのに使う可能性がある
		this.level = 0;
		this.stage = 0;
		// パーティクルシステム
		// システム側に画像を持たせてそれを乗せるか。
		this.particles = new ParticleSystem();
		// クリア用フラグ（ノーマルを全滅させたところでボールの動きを止めたい）
		this.clearFlag = false; // ノーマル全滅でtrueにする
	}
	setPattern(level, stage){
		// levelとstageによりjsonからステージシードを引き出す：
		// const seed = stageData["level" + level]["stage" + stage];
		this.level = level; // 描画用
		this.stage = stage; // 描画用
		// グラフィック
		this.gr = createGraphics(480, 440);
		this.gr.noStroke();
		this.gr.colorMode(HSB, 100);
		this.particles.setGraphic(480, 440); // ここに毎フレーム描画する感じね
		// ボール
		this.ball.initialize(); // ボールの初期化
		// ガター
		const colliders = [new RectCollider(0, 420, 480, 20)];
		this.gutter.setting(480, 440, colliders);
		// ブロック
		this.blocks = [];
		this.blocks.push(new Block(0, 3, 1, 18));
		this.blocks.push(new Block(23, 3, 1, 18));
		this.blocks.push(new Block(1, 3, 22, 1));
		this.blocks.push(new Block(6, 7, 2, 1, NORMAL, 1, 65));
		this.blocks.push(new Block(6, 9, 2, 1, NORMAL, 1, 65));
		this.blocks.push(new Block(6, 11, 2, 1, NORMAL, 1, 65));
		this.blocks.push(new Block(8, 7, 2, 1, NORMAL, 2, 77));
		this.blocks.push(new Block(8, 9, 2, 1, NORMAL, 2, 77));
		this.blocks.push(new Block(8, 11, 2, 1, NORMAL, 2, 77));
		this.blocks.push(new Block(10, 7, 2, 1, NORMAL, 3, 5));
		this.blocks.push(new Block(10, 9, 2, 1, NORMAL, 3, 5));
		this.blocks.push(new Block(10, 11, 2, 1, NORMAL, 3, 5));
		this.blocks.push(new Block(12, 7, 2, 1, NORMAL, 4, 5));
		this.blocks.push(new Block(12, 9, 2, 1, NORMAL, 4, 5));
		this.blocks.push(new Block(12, 11, 2, 1, NORMAL, 4, 5));
		this.blocks.push(new Block(14, 7, 2, 1, NORMAL, 5, 5));
		this.blocks.push(new Block(14, 9, 2, 1, NORMAL, 5, 5));
		this.blocks.push(new Block(14, 11, 2, 1, NORMAL, 5, 5));
		this.blocks.push(new Block(13, 5, 2, 1, LIFEUP, 1));
		// パドル
		this.paddles = [];
		const paddleLength = PADDLE_LENGTH[this.mode];
		this.paddles.push(new LinePaddle(20 + this.ball.radius * 1.95, 460 - paddleLength - this.ball.radius * 1.95,
			                               416, 416, paddleLength, 4, -PI/2));
		this.paddles[0].setBall(this.ball);
		this.currentPaddleId = 0;
		// クリアフラグのリセット
		this.clearFlag = false;
	}
	initialize(mode){
		// レベルの最初に行なう処理。スコアのリセットとライフ設定
		this.score = 0;
		this.mode = mode;
		this.ball.setLife(LIFES[mode]);
	}
	getOffSet(){
		return {x:(CANVAS_W - this.gr.width) * 0.5, y:(CANVAS_H - this.gr.height) * 0.5};
	}
	clickAction(){
		// ボールがnonActive: activateしておわり。active:すべてのパドルをactivateする
		if(this.currentPaddleId >= 0){
			this.paddles[this.currentPaddleId].removeBall();
			this.ball.activate();
			this.currentPaddleId = -1;
		}else{
			for(let pdl of this.paddles){ pdl.activate(); }
		}
	}
	getCollidePoint(){
		return {x:this.ball.x + this.ball.radius * Math.cos(this.ball.direction),
			      y:this.ball.y + this.ball.radius * Math.sin(this.ball.direction)};
	}
	createBallParticle(p, drawFunction, particleNum){
		// ボールのパーティクル
		this.particles.createParticle(p.x, p.y, color(BREAK_PALETTE[6 + this.ball.level]), drawFunction, particleNum);
	}
	createBlockParticle(p, id, particleNum){
		// ブロックのパーティクル
		// のちに円形ブロック使うようになったらまた変わるかもだけどね。円形には当たると強制アクティベートの付加効果を持たせるつもり
		this.particles.createParticle(p.x, p.y, color(BREAK_PALETTE[id]), drawStar, particleNum);
	}
	createBlockSound(b){
		switch(b.blockType){
			case WALL:
			  myMusic.playWallSound();
				break;
			case NORMAL:
			  myMusic.playBlockSound(b.getId() + 7 * this.ball.level);
				break;
			case LIFEUP:
			  myMusic.playBlockSound(5 + 7 * this.ball.level);
				break;
		}
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
				this.createBlockSound(b);
				const id = b.getId();
				b.hitWithBall(this.ball);
				if(b.isAlive()){
					this.createBlockParticle(p, id, 5);
				}else{
					this.createBlockParticle(p, id, 20);
				}
				this.ball.hitWithBlock(b);
				b.collider.reflect(this.ball);
				break;
			}
		}
		let id = -1;
		for(let i = 0; i < this.blocks.length; i++){
			if(!this.blocks[i].isAlive()){ id = i; break; }
		}
		if(id >= 0){ this.blocks.splice(id, 1); }
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
		if(!this.ball.isAlive()){ return; }
		const offSet = this.getOffSet();
		const mx = constrain((mouseX - offSet.x) / this.gr.width, 0, 1);
		const my = constrain((mouseY - offSet.y) / this.gr.height, 0, 1);
		for(let pdl of this.paddles){ pdl.move(mx, my); pdl.updateBall(); pdl.update(); }
		if(this.ball.isActive()){
			this.collideWithBlocks();
			this.collideWithPaddles();
	  }
		// ここでフラグをチェック
		this.clearFlag = true;
		for(let b of this.blocks){
			if(b.blockType === NORMAL){ this.clearFlag = false; break; }
		}
		if(this.clearFlag){ return; } // クリア条件を満たしたら以降の処理はキャンセル
		this.ball.update();
		if(this.ball.isActive()){
			if(this.gutter.check(this.ball)){
				// ボールがやられるときのパーティクルは6番以降の色を使う。三角形。
				const p = this.getCollidePoint();
				// 音を出すね
				myMusic.playDeathSound();
				this.createBallParticle(p, drawTriangle, 20);
				this.ball.kill();
			}
		}
	}
	gameoverCheck(){
		// ここでパーティクルが残ってたら移動しないようにする・・
		if(!this.particles.isEmpty()){ return false; }
		if(this.ball.isAlive()){ return false; }
		if(!this.ball.isAlive() && this.ball.getLife() > 0){
      this.ball.initialize();
			this.paddles[0].setBall(this.ball);
			this.currentPaddleId = 0;
			return false;
		}
		return true;
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
		this.gr.background(0);
		// ガター
		this.gutter.draw(this.gr);
		// ブロック、パドル、ボール
		for(let b of this.blocks){ b.draw(this.gr); }
		for(let pdl of this.paddles){ pdl.draw(this.gr); }
		if(this.ball.isAlive()){ this.ball.draw(this.gr); }
		// パーティクルの描画
		this.particles.draw(this.gr);
		// コンフィグパート
		this.gr.fill(0, 0, 100);
		// ステージ番号を描画
		// スコアを描画
		// ライフを描画
		for(let k = 0; k < this.ball.getLife(); k++){
			let cx = 180 + 30 * (k % 10) + 15;
			let cy = Math.floor(k / 10) * 30 + 15;
			this.gr.circle(cx, cy, 25);
		}
	}
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
		this.life = 0;
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
		this.grList = createGraphics(this.radius * 4, this.radius * 2);
		this.grList.colorMode(HSB, 100);
		this.grList.noStroke();
		this.prepareBallGraphics();
		this.gr.image(this.grList, 0, 0);
	}
	prepareBallGraphics(){
		let g = this.grList;
		for(let i = 0; i < this.radius * 2; i++){
			g.fill(50 + i * 25 / this.radius);
			g.circle(this.radius, this.radius, this.radius * 2 - i);
		}
		for(let i = 0; i < this.radius * 2; i++){
			g.fill(25, 100 - i * 50 / this.radius, 100);
			g.circle(this.radius * 3, this.radius, this.radius * 2 - i);
		}
	}
	getLife(){
		return this.life;
	}
	setLife(life){
		this.life = life;
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
	kill(){
		this.life--;
		this.alive = false;
	}
	setStatus(){
		this.speed = STATUS.speed[this.level];
		this.attack = STATUS.attack[this.level];
		const diam = this.radius * 2;
		this.gr.clear();
		this.gr.image(this.grList, 0, 0, diam, diam, diam * this.level, 0, diam, diam);
	}
	hitWithBlock(_block){
		// LIFEUPでライフ回復。まあそのくらい。
		switch(_block.blockType){
			case LIFEUP:
			  this.life++;
				break;
		}
	}
	hitWithPaddle(_paddle){
		// パドルがアクティブのときレベルアップ（ただし上限のときは反応無し）
		if(!_paddle.isActive()){ return; }
		if(this.level === 1){ return; }
		this.level++;
		this.poweredCount = 240;
		myMusic.playPowerupSound();
		this.setStatus();
	}
	initialize(){
		// 落ちてから復活するたびにこれをやる
		// 最終的にはガターにぶつかってパーティクルが出てそれが済んでからこれをやる。
		this.alive = true;
		this.level = 0;
		this.setStatus();
		this.active = false;
		this.nonActiveFrameCount = 0;
		this.poweredCount = 0;
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
			if(this.poweredCount === 0){
				this.level--;
				this.setStatus();
			}
		}
		this.x += this.speed * cos(this.direction);
		this.y += this.speed * sin(this.direction);
	}
	draw(gr){
		gr.image(this.gr, this.x - this.radius, this.y - this.radius);
		if(this.level > 0){
		  gr.stroke(25, 100, 100);
			gr.noFill();
		  gr.strokeWeight(2);
		  const barLength = this.poweredCount * Math.PI * 2 / 240;
		  gr.arc(this.x, this.y, this.radius * 4, this.radius * 4, -Math.PI / 2, -Math.PI / 2 + barLength);
		  gr.noStroke();
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
	update(){
		if(this.active){
			this.activeCount--;
			if(this.activeCount === 0){
				this.inActivate();
			}
		}
	}
}

class LinePaddle extends Paddle{
	constructor(x1, x2, y1, y2, w, h, direction){
		super();
		this.xRange = [x1, x2];
		this.yRange = [y1, y2];
		this.x = 0;
		this.y = 0;
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
		if(this.ball !== undefined){
		  gr.stroke(0, 0, 100);
		  gr.strokeWeight(2);
		  gr.line(this.ball.x, this.ball.y,
				      this.ball.x + this.w * cos(this.ball.direction), this.ball.y + this.w * sin(this.ball.direction));
			gr.noStroke();
		}
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
		this.t1 = -w * 0.5 / r;
		this.t2 = w * 0.5 / r;
		this.directionFlag = directionFlag; // 内向きか外向きかって話. 0なら外向き、1なら内向き。これのPI倍を足せばいい。
		this.direction = directionFlag * Math.PI;
		// パドルなので4で固定ね
		this.collider = new ArcCollider(this.cx, this.cy, this.r, 4, this.t1, this.t2);
	}
	move(mx, my){
		// まず(0.5, 0.5)を中心とする方向を割り出す
		const t = atan2(my - 0.5, mx - 0.5);
		this.t1 = t - this.w * 0.5 / this.r;
		this.t2 = t + this.w * 0.5 / this.r;
		this.direction = t + directionFlag * Math.PI;
		this.collider.update(this.t1, this.t2);
	}
	updateBall(){}
	draw(gr){}
}

// ----------------------------------------------------------------------------------- //
// block.

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
		this.gr.textSize(22);
		this.gr.textAlign(CENTER, CENTER);
		this.gr.textFont(huiFont);
		this.drawBlockImage();
	}
	getId(){
		// パーティクル出力用のidを返す関数
		switch(this.blockType){
			case NORMAL:
			  return this.tough - 1; // toughは1,2,3,4,5であることが前提
			case LIFEUP:
			  return 5;
			case WALL:
			  return 6;
		}
	}
	drawBlockImage(){
		this.gr.clear();
		switch(this.blockType){
			case NORMAL:
			  Block.normalDraw(this.gr, this.w, this.h, 0.15, BLOCK_HUE[this.tough - 1]);
				break;
			case LIFEUP:
			  Block.normalDraw(this.gr, this.w, this.h, 0.15, 88);
				this.gr.fill(0);
				this.gr.text("L", this.w * 0.5, this.h * 0.35);
				break;
			case WALL:
			  Block.wallDraw(this.gr, this.w, this.h, 0.3);
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
		this.tough = max(0, this.tough - _ball.attack);
		if(this.tough === 0){ this.kill(); return; }
		// returnしないと実行されちゃうでしょこの馬鹿！！！！！！
		this.drawBlockImage(); // killの後に描かないとエラーになる。当たり前。
	}
	draw(gr){
		gr.image(this.gr, this.x, this.y);
	}
	static normalDraw(gr, w, h, ratio, hue){
		const diff = ratio * GRIDSIZE;
		gr.fill(hue, 50, 100);
		gr.rect(0, 0, w, h);
		gr.fill(hue, 100, 50);
		gr.rect(diff, diff, w - diff, h - diff);
		gr.fill(hue, 100, 100);
		gr.rect(diff, diff, w - diff * 2, h - diff * 2);
	}
	static wallDraw(gr, w, h, ratio){
		gr.clear();
		const diff = ratio * GRIDSIZE;
		gr.fill(75);
		gr.rect(0, 0, w, h);
		gr.fill(25);
		gr.rect(diff, diff, w - diff, h - diff);
		gr.fill(50);
		gr.rect(diff, diff, w - diff * 2, h - diff * 2);
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
			}
		}
	}
	check(_ball){
		// 当たり判定
		for(let c of this.colliders){ if(c.collideWithBall(_ball)){ return true; } }
		return false;
	}
	draw(gr){
		gr.image(this.gr, 0, 0);
	}
}

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
	collideWithBall(_ball){
		// 速度を足す。
		const d = _ball.direction;
		const postX = _ball.x + _ball.speed * cos(d);
		const postY = _ball.y + _ball.speed * sin(d);
		// ぶつかるかどうか調べてtrueかfalseを返すだけ。
		if(this.x + this.w < postX - _ball.radius || postX + _ball.radius < this.x){ return false; }
		if(this.y + this.h < postY - _ball.radius || postY + _ball.radius < this.y){ return false; }
		return true;
	}
	reflect(_ball){
		// ぶつかる場合に速度を変える
		const d = _ball.direction;
		const postX = _ball.x + _ball.speed * cos(d);
		const postY = _ball.y + _ball.speed * sin(d);
		const cx = this.x + this.w * 0.5;
		const cy = this.y + this.h * 0.5;
		if(abs(postX - cx) < this.w * 0.5){ _ball.setDirection(-d); return; }
		if(abs(postY - cy) < this.h * 0.5){ _ball.setDirection(Math.PI - d); return; }
		let mainDirection;
		if(postX > cx && postY > cy){ mainDirection = Math.PI / 4; }
		if(postX < cx && postY > cy){ mainDirection = Math.PI * 3 / 4; }
		if(postX < cx && postY < cy){ mainDirection = Math.PI * 5 / 4; }
		if(postX > cx && postY < cy){ mainDirection = Math.PI * 7 / 4; }
		_ball.setDirection(mainDirection + (Math.random() * 2 - 1) * Math.PI / 12);
	}
}

// 厚みが必要。バームクーヘン的な。パドル専用。厚みは4で固定・・んー。
class ArcCollider extends Collider{
  constructor(cx, cy, r, h, t1, t2){
		super();
		this.type = "arc";
		this.cx = cx;
		this.cy = cy;
		this.r = r;
		this.h = h;
		this.t1 = t1;
		this.t2 = t2;
	}
	update(t1, t2){
		this.t1 = t1;
		this.t2 = t2;
	}
	collideWithBall(_ball){
		// 速度を足す。
		const d = _ball.direction;
		const postX = _ball.x + _ball.speed * cos(d);
		const postY = _ball.y + _ball.speed * sin(d);
		// ボールの中心の方向がt1-diff～t2+diffの範囲内にあるか調べる。
		// diffはthis.h/2に相当する長さの角度のずれ、要するにthis.h / (2 * this.r)ね。
		// あったとして、今度は中心からの距離を取り、this.rとの差が、絶対値が、厚さの半分と半径の和より大きいならfalse.
		// 扇形はそれほど大きいものを想定していないので範囲内かどうかについてはcosの値で判定すればOK.
		const diff = this.h / (2 * this.r);
		const ballDir = atan2(_ball.y - this.cy, _ball.x - this.cx);
		if(Math.cos(ballDir - diff - (this.t1 + this.t2) * 0.5) < Math.cos(diff + (this.t2 - this.t1) * 0.5)){ return false; }
		const ballDistance = dist(_ball.x, _ball.y, this.cx, this.cy);
		if(abs(ballDistance - this.r) > this.h * 0.5 + _ball.radius){ return false; }
		return true;
	}
	reflect(_ball){
		// 中心がdiffの内側なら普通に反射する感じ
		// はじっこのときは然るべく反射する
		// 外側か内側かで向きが変わるので注意
	}
}

// 円環も用意するか。これはガター専用。処理が煩雑になるので分ける。
class RingCollider extends Collider{
	constructor(){
		super();
		this.type = "ring";
	}
}

// 円タイプのブロックも今後使っていきたい。円は緑系統の色で。
class CircleCollider extends Collider{
	constructor(){
		super();
		this.type = "circle";
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
	update(){
		this.life--;
		this.rotationAngle += PARTICLE_ROTATION_SPEED;
		if(this.life === 0){ this.alive = false; }
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
		this.directionRange = [0, 2 * PI]; // ここをいじると色んな方向にとびだす
		//this.lifeFactor = 1.0;
		this.sizeFactor = 1.0;
		this.hop = false; // particleが放物線を描くかどうか。デフォはまっすぐ。
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
	createParticle(x, y, baseColor, drawFunction, particleNum){
		for(let i = 0; i < particleNum; i++){
			let ptc = particlePool.use();
			// 一応基本は[0, 2 * PI]で。特定方向に出す場合も考慮・・
			const direction = random(this.directionRange[0], this.directionRange[1]);
			ptc.initialize(x, y, direction, baseColor, drawFunction, this.sizeFactor, this.hop);
			this.particleArray.add(ptc);
		}
	}
	setDirectionRange(rangeArray){
		this.directionRange = rangeArray;
		return this;
	}
	setSizeFactor(sizeFactor){
		this.sizeFactor = sizeFactor;
		return this;
	}
	setHop(flag){
		this.hop = flag;
		return this;
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
