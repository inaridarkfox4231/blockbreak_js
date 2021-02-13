// STGもどきの前段階としてブロック崩しに挑戦します。サイズは480x400でpythonからの移植。
// ステージを構成するjsonは別ルートで構成する流れ・・うまくいくか知らんけど

// State一覧
// Title, SelectLevel, SelectMode, Play, Pause, Gameover, Clear(AllClear)で全部

let mySystem;
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

// 遷移図作り直し（てかp5jsで描こうよ）
class System{
	constructor(){
		this.state = {title:new Title(this), selectLevel:new SelectLevel(this), selectMode:new SelectMode(this), play:new Play(this),
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

class Title extends State{
	constructor(_node){
		super(_node);
		this.name = "title";
		this.drawPrepare();
	}
  drawPrepare(){
		this.gr.background(80, 128, 255);
		this.gr.textFont(huiFont);
		this.gr.textAlign(CENTER, CENTER);
		this.gr.fill(0);
		this.gr.textSize(80);
		this.gr.text("BLOCKBREAK", CANVAS_W * 0.5, CANVAS_H * 0.33);
		this.gr.textSize(40);
		this.gr.text("PRESS ENTER KEY", CANVAS_W * 0.5, CANVAS_H * 0.6);
	}
	prepare(_state){}
  keyAction(code){
    // エンターキー押したらセレクトへ
    if(code === K_ENTER){
      this.setNextState("selectLevel");
    }
	}
	update(){}
	draw(){
		image(this.gr, 0, 0);
	}
}

class SelectLevel extends State{
	constructor(_node){
		super(_node);
		this.name = "selectLevel";
		this.choice = 0;
		this.choiceLength = 6; // 0:TO TITLE, 1～5:各レベル（実際は0～4）
		this.txt = ["TO TITLE", "LEVEL 0", "LEVEL 1", "LEVEL 2", "LEVEL 3", "LEVEL 4"];
		this.base = createGraphics(CANVAS_W, CANVAS_H);
		this.drawPrepare();
	}
  drawPrepare(){
		this.base.background(40, 128, 255);
		this.gr.textSize(30);
		this.gr.noStroke();
		this.gr.textFont(huiFont);
	}
	prepare(_state){
		// choice変数を0に戻さないと
		this.choice = 0;
	}
  keyAction(code){
    // 上下キーで選択、エンターキーでtitleまたはmodeに移行
    switch(code){
      case K_UP:
        this.choice = (this.choice + this.choiceLength - 1) % this.choiceLength;
        break;
      case K_DOWN:
        this.choice = (this.choice + 1) % this.choiceLength;
        break;
      case K_ENTER:
        if(this.choice === 0){
          this.setNextState("title");
        }else{
          this.setNextState("selectMode");
        }
        break;
    }
	}
	update(){
		// そうね・・やること、ないわね・・
	}
	draw(){
    this.gr.image(this.base, 0, 0);
		let col = [0, 0, 0, 0, 0, 0];
		col[this.choice] += 255;
		const left = 135;
		if(col[0] > 0){ this.gr.fill(0); this.gr.rect(left, 40, 130, 30); }
		this.gr.fill(col[0]);
		this.gr.text(this.txt[0], left + 2, 63);
		for(let k = 1; k < 6; k++){
			if(col[k] > 0){ this.gr.fill(0); this.gr.rect(left, 70 + 50 * k, 183, 30); }
			this.gr.fill(col[k]);
			this.gr.text(this.txt[k], left + 2, 93 + 50 * k);
		}
    image(this.gr, 0, 0);
	}
}

// このページで操作説明する
// 難易度はEASY, NORMAL, HARD, CRAZYの4種類でいこうか（同じ仕様でやる）
// 難易度ごとに色変える感じで（青→緑→黄色→赤）
class SelectMode extends State{
	constructor(_node){
		super(_node);
		this.name = "selectMode";
		this.base = createGraphics(CANVAS_W, CANVAS_H);
		this.level = 0; // selectからレベルの情報を受け取る。playに渡す。
		this.levelText = ""; // STAGE--～--のテキストをコピーする感じ
		this.choice = 0; // playのdifficultyとなる値。modeという名前になってるのは、要するに選択画面では常に"mode"という名前を使うってだけの話。
		// playの方でlevelとdifficulty,更にステージ番号1～5に応じてステージが生成されてゲームが行われる
		// ライフ0になったらタイトルに強制的に戻されクリアの場合は次のステージに進み全部クリアしたらやはりタイトルに戻る（スコア表示後）
		// セーブ機能は無いけどまあスコアがセレクト画面に記録されるくらいはいいかなって思うけども（クッキー使う？）
		this.choiceLength = 5; // 0:TO SELECT, 1～4:難易度。
		this.txt = ["TO SELECT", "EASY", "NORMAL", "HARD", "CRAZY"];
		this.drawPrepare();
	}
  drawPrepare(){
		this.base.background(128);
		/* ここでインストラクション書いた方がいいかもなぁ */
		this.gr.textSize(30);
		this.gr.noStroke();
		this.gr.textFont(huiFont);
	}
	prepare(_state){
		// モード変数を0に戻す。
		this.choice = 0;
		// ModeにはSelectからしか来ることができないのでlevelをここでSelectの情報を元に設定
		this.level = _state.choice - 1; // 0～4
		this.levelText = _state.txt[_state.choice]; // それに応じたテキスト
	}
  keyAction(code){
    // 上下キーで選択、エンターキーでselectまたはplayに移行
    switch(code){
      case K_UP:
        this.choice = (this.choice + this.choiceLength - 1) % this.choiceLength;
        break;
      case K_DOWN:
        this.choice = (this.choice + 1) % this.choiceLength;
        break;
      case K_ENTER:
        if(this.choice === 0){
          this.setNextState("selectLevel");
        }else{
					// SelectModeからplayに行くときとclearからplayに行くときで処理を若干変える。
					// 仕事はほぼgameSystemに一任する。
          this.setNextState("play");
        }
        break;
		}
	}
	update(){
		// まあ、やることは、ないわな・・
	}
	draw(){
    this.gr.image(this.base, 0, 0);
		let col = [0, 0, 0, 0, 0];
		col[this.choice] += 255;
		const left = 35;
		const top = 80;
		this.gr.fill(0);
		this.gr.text("--" + this.levelText +" is choosed--", left + 2, top + 23 - 50);
		if(col[0] > 0){ this.gr.fill(0); this.gr.rect(left, top, 140, 30); }
		this.gr.fill(col[0]);
		this.gr.text(this.txt[0], left + 2, top + 23);
		for(let k = 1; k < 5; k++){
			if(col[k] > 0){ this.gr.fill(0); this.gr.rect(left, top + 30 + 50 * k, 103, 30); }
			this.gr.fill(col[k]);
			this.gr.text(this.txt[k], left + 2, top + 53 + 50 * k);
		}
    image(this.gr, 0, 0);
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
			case "selectMode":
			  this.gameSystem.initialize(_state.choice - 1); // 1を引くって感じで。mode（難易度）設定。
				this.level = _state.level; // レベル番号要るかな・・んー
				this.stage = 0; // ステージ番号リセット
				break;
		}
		this.gameSystem.setPattern(this.level * 5 + this.stage); // レベルとステージからレベル*5＋ステージで番号(0～24)
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

// play内部でこれを呼び出す感じ
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
	}
	setPattern(id){
		// idによりjsonからステージシードを引き出す：const seed = stageData["stage" + id];：こんな感じ
		this.gr = createGraphics(480, 460);
		this.gr.noStroke();
		this.ball.initialize(); // ボールの初期化
		const colliders = [new RectCollider(20, 440, 440, 20)];
		this.gutter.setting(480, 460, colliders);
		this.blocks = [];
		this.blocks.push(new Block(0, 3, 1, 20));
		this.blocks.push(new Block(23, 3, 1, 20));
		this.blocks.push(new Block(1, 3, 22, 1));
		this.blocks.push(new Block(8, 8, 2, 1, NORMAL, 1));
		this.blocks.push(new Block(8, 6, 2, 1, NORMAL, 2));
		this.blocks.push(new Block(8, 12, 2, 1, NORMAL, 3));
		this.blocks.push(new Block(13, 8, 1, 2, LIFEUP, 1));
		this.paddles = [];
		this.paddles.push(new LinePaddle(20, 420, 416, 416, 40, 4, -PI/2));
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
			for(let pdl of this.paddles){ pdl.activeSwitch(); }
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
		this.gr.fill(255);
		for(let k = 0; k < this.ball.getLife(); k++){
			let cx = 120 + 30 * k + 15;
			let cy = 0 + 15;
			this.gr.circle(cx, cy, 25);
		}
	}
}

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
		this.attack = 1;
		this.speed = 4;
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
		switch(this.level){
			case 0: gr.fill(128); break;
			case 1: gr.fill(255, 128, 0); break;
		}
		gr.circle(this.x, this.y, this.radius * 2);
	}
}

// 0～1のマウス値から位置を出す
class Paddle{
	constructor(){
	  this.ball = undefined;
		this.active = false; // active時は色が変わる. activeはクリックで切り替える。
		this.direction = 0; // lineとarcで若干違う感じ
	}
	isActive(){
		return this.active;
	}
	activeSwitch(){
		this.active = !this.active;
	}
	setBall(_ball){
		this.ball = _ball;
	}
	removeBall(){
		this.ball = undefined;
	}
	update(){}
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
		if(this.active){ gr.fill(255, 242, 0); }else{ gr.fill(255); }
		gr.rect(this.x, this.y, this.w, this.h);
		if(this.ball !== undefined){
		  gr.stroke(255);
		  gr.strokeWeight(2);
		  gr.line(this.ball.x, this.ball.y,
				      this.ball.x + this.w * cos(this.ball.direction), this.ball.y + this.w * sin(this.ball.direction));
			gr.noStroke();
		}
	}
}

class ArcPaddle extends Paddle{

}

// NORMALとLIFEUPとWALL. まあとりあえずWALLかな
class Block{
	constructor(gridX, gridY, gridW, gridH, blockType = WALL, tough = Infinity){
		this.x = gridX * GRIDSIZE;
		this.y = gridY * GRIDSIZE;
		this.w = gridW * GRIDSIZE;
		this.h = gridH * GRIDSIZE;
		this.blockType = blockType;
		this.tough = tough;
		this.alive = true;
		this.collider = new RectCollider(this.x, this.y, this.w, this.h);
	}
	orthodoxDraw(gr, ratio, col1, col2, col3, round = 0){
		// 1UPは丸っこくする
		const diff = ratio * GRIDSIZE;
		gr.fill(...col1);
		gr.rect(this.x, this.y, this.w, this.h, round);
		gr.fill(...col2);
		gr.rect(this.x + diff, this.y + diff, this.w - diff, this.h - diff, round);
		gr.fill(...col3);
		gr.rect(this.x + diff, this.y + diff, this.w - diff * 2, this.h - diff * 2, round);
	}
	isAlive(){
		return this.alive;
	}
	kill(){
		this.alive = false;
	}
	hitWithBall(_ball){
		if(this.tough - _ball.attack > 1){ return; }
		this.tough -= _ball.attack;
		if(this.tough <= 0){ this.kill(); }
	}
	draw(gr){
		switch(this.blockType){
			case WALL:
			  this.orthodoxDraw(gr, 0.3, [180, 180, 180], [60, 60, 60], [120, 120, 120]);
				break;
			case NORMAL:
			  const diff = (this.tough - 1) * 80;
			  this.orthodoxDraw(gr, 0.15, [240 - diff, 250 - diff, 250], [160 - diff, 200 - diff, 250], [200 - diff, 230 - diff, 255]);
				break;
			case LIFEUP:
			  this.orthodoxDraw(gr, 0.3, [250, 140, 170], [230, 0, 74], [255, 72, 132], GRIDSIZE * 0.5);
				break;
		}
	}
}

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

// 厚みが必要。バームクーヘン的な。パドル専用。
class ArcCollider extends Collider{
  constructor(){
		super();
		this.type = "arc";
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

function keyPressed(){
  mySystem.currentState.keyAction(keyCode);
	return false;
}

function mouseClicked(){
	mySystem.currentState.clickAction();
	return false;
}
