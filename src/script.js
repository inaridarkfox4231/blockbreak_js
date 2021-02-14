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

let huiFont;

// ----------------------------------------------------------------------------------- //
// main.

function preload(){
	huiFont = loadFont("https://inaridarkfox4231.github.io/assets/HuiFont29.ttf");
}

function setup() {
	createCanvas(CANVAS_W, CANVAS_H);
	mySystem = new System();
}

function draw() {
	mySystem.update();
	mySystem.draw();
	mySystem.shift();
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
	prepare(_state){}
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
			this.level = Math.floor((mx - 220) / 90);
			this.drawLevelButtons();
		}
		if(mx > 260 && mx < 610 && my > 400 && my < 440){
			if((mx - 260) % 90 > 80){ return; }
			this.mode = Math.floor((mx - 260) / 90);
			this.drawModeButtons();
		}
		if(mx > 340 && mx < 460 && my > 505 && my < 565){
			this.setNextState("play");
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
		// ゲームオーバーにするか否かの処理。trueを返したらゲームオーバーに移行する
		this.gameSystem.update();
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
	}
	setPattern(level, stage){
		// levelとstageによりjsonからステージシードを引き出す：
		// const seed = stageData["level" + level]["stage" + stage];
		this.level = level; // 描画用
		this.stage = stage; // 描画用
		this.gr = createGraphics(480, 448);
		this.gr.noStroke();
		this.gr.colorMode(HSB, 100);
		this.ball.initialize(); // ボールの初期化
		const colliders = [new RectCollider(20, 428, 440, 20)];
		this.gutter.setting(480, 460, colliders);
		this.blocks = [];
		this.blocks.push(new Block(0, 3, 1, 20));
		this.blocks.push(new Block(23, 3, 1, 20));
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
		this.paddles = [];
		const paddleLength = PADDLE_LENGTH[this.mode];
		this.paddles.push(new LinePaddle(20, 460 - paddleLength, 416, 416, paddleLength, 4, -PI/2));
		this.paddles[0].setBall(this.ball);
		this.currentPaddleId = 0;
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
	collideWithBlocks(){
		for(let b of this.blocks){
			if(b.collider.collideWithBall(this.ball)){
				b.hitWithBall(this.ball);
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
				this.ball.hitWithPaddle(pdl);
				pdl.collider.reflect(this.ball);
				break;
			}
		}
	}
	update(){
		if(!this.ball.isAlive()){ return; }
		const offSet = this.getOffSet();
		const mx = constrain((mouseX - offSet.x) / this.gr.width, 0, 1);
		const my = constrain((mouseY - offSet.y) / this.gr.height, 0, 1);
		for(let pdl of this.paddles){ pdl.move(mx, my); pdl.updateBall(); pdl.update(); }
		if(this.ball.isActive()){
			this.collideWithBlocks();
			this.collideWithPaddles();
	  }
		this.ball.update();
		if(this.ball.isActive()){
			if(this.gutter.check(this.ball)){
				this.ball.kill();
			}
		}
	}
	gameoverCheck(){
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
		for(let b of this.blocks){
			if(b.blockType === NORMAL){ return false; }
		}
		return true;
	}
	draw(){
		this.gr.background(0);
		this.gutter.draw(this.gr);
		for(let b of this.blocks){ b.draw(this.gr); }
		for(let pdl of this.paddles){ pdl.draw(this.gr); }
		if(this.ball.isAlive()){ this.ball.draw(this.gr); }
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
			g.fill(10, 100 - i * 50 / this.radius, 100);
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
		  gr.stroke(10, 100, 100);
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
		this.tough -= _ball.attack;
		if(this.tough <= 0){ this.kill(); return; }
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
		this.colliders = [];
	}
	setting(w, h, colliders){
		this.gr = createGraphics(w, h);
		this.gr.noStroke();
		this.gr.colorMode(HSB, 100);
		this.colliders = colliders;
		for(let c of this.colliders){
			switch(c.type){
				case "rect":
				  this.gr.fill(0, 100, 100);
					this.gr.rect(c.x, c.y, c.w, c.h);
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
// interaction.

function keyPressed(){
  mySystem.currentState.keyAction(keyCode);
	return false;
}

function mouseClicked(){
	mySystem.currentState.clickAction();
	return false;
}
