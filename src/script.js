// STGもどきの前段階としてブロック崩しに挑戦します。サイズは480x400でpythonからの移植。
// ステージを構成するjsonは別ルートで構成する流れ・・うまくいくか知らんけど
// GLSLでもいいか？ピクセル単位で処理するとか。ステージメーカー的な。で、色取得でステージを作るみたいな。うん。
// となるとエディタも作らないと・・めんど。

// 説明書きはModeのところでやろうね
// 背景は三角形や四角形のコラージュ的な（ランダム配置みたいな）
// 単なるグラデだと芸がないので
// まあロジック移植してからでいいです（テトリスの方もそこら辺いじりたいけどまあいいか別に）（STEP10で）

// ステージエディタがないと話にならないので
// 1x1,1x2,2x1,2x2と黄緑とか緑の壊しにくいやつなどなど灰色の壊せないやつとかクリックでそこに配置されて色情報、
// 色情報からそれを元にして・・
// データとしてはどこにどのブロックがあるってだけの話だから。
// ビジュアルだけ分かりやすくしてそれとは別にどこ・・jsonの方がいいな。saveJSONってあるからこれ使うね
// イメージ：{"blue1":[[2, 3], [4, 7], ...]}
// 左上のグリッド番号の配列。存在するものすべてについて。jsonのまま保持しておいて
// アイキャッチに来るたびに実物（ブロッククラスの集合体）に変換し終わったら破棄する
// 作るやつは別に作る(22x13らしい), ひとつひとつが20x20なので440x260だけどそれと別にいろいろ必要そう（ブロック選択とかセーブボタンとか）
// ブロック選択は画像使いたいよね
// ステージ作りとかはまあ、移植なので余計なことは考えなくていいよ

// まああれ、つぶつぶ以外で受けるもの作るにはこれくらいやってデフォールトってわけ。じゃなきゃまたつぶつぶ量産しないといけない
// それもネタ切れになったらおわり
// 厳しいなぁ
// 去年はそれやったせいで熱出してアウトになってそこからピアノやめるとかいろいろ方針転換した
// 今年それやったら下手すると人生詰むんで作戦「いのちをだいじに」で切るべきところはどんどん切っていこう

// エディタは後回し。先にブロッククラスかな。で、パーサー。で、サンプルを作ってそれを元にいろいろテスト。
// ステージもコピペでいい。一つ一つを簡単なシードにして。それで原型を作る。
// エディタはそのあと。
// 装飾はさらにそのあと。長丁場になる。
// 作ってた頃は働いてなかったからエネルギー全注力できたけど今はそれできないから少しずつ少しずつやっていくしかないわね。

// ライフは3, 6, 10, 15でいい気がしてきた。あと難易度丁度いい（気がする）のでこのまま作っちゃおう。
// 衝突判定単純でした。バリデーションかけたあと、移動後に衝突するならそれを使う感じで、あとぶつかった時の反射はその
// calc_is_farを使ってバリデーションかけてる、これがあれの時は判定に使わない、的な感じのあれ。
// colliderに相当するのはrectでしょう。これでいいか。
// つまりボールはrectと思ってやってるのね。

// サイズの確認
// 各ブロックは20x20が基本で最大で40x40とか20x200とか200x20
// ボールは16x16
// パドルは横幅が80,60,40,30で縦幅が5です（薄い）

// 簡単にまとめるね
// ブロックについて、色ごとに当たると色が薄くなっていく仕様にする。で、
// a0～a4,b0～b4,c0～c4,d0～d4が例の5種類とする、0～4はタフネス、これが0の時に当たると消えるみたいな。
// e0,e1,e2については緑、黄緑、スカイブルーで高速時じゃないと壊せない感じで0,1,2がタフネス
// 高速かどうかはボールクラスの速度いじって決めたり
// f0～f9とg0～g9は壁ブロック
// h0,k0は1UPでこれは横と縦がある(横がh0で縦がk0みたいな)
// プロパティmustがtrueのものをすべて壊してかつエフェクト配列が空っぽならゲームクリア
// 色別にしたいのはパーティクルをカラフルにしたいから（オレンジと黄色と緑しか出ないんじゃつまんない）
// ブロックが壊れるときに位置と色が指定されてエフェクト、これが一定フレームで消える。

// playのinitializeで難易度ごとにライフ設定（レベルごとにずっと継続）でスコアも0にリセット
// これはmodeからeyecatchに行くときにnode経由で直接指示を出す

// ボールやパドルやブロックのxとかyは左上の値とする、とはいえブロック動かないからrectだけでいいんだけど。じゃあ要らないか。
// パドルについてもupdateってマウス位置にパドル置くだけだし。難易度で幅が決まり、それとマウス位置からパドルの位置が決まる。
// じゃあボールだけか。で、update詳細。
// まずブロックは動かない、パドル位置をマウス位置に応じて更新。
// 次にボールとパドルを見てボールに速度足した時のcolliderがパドルとぶつかるようなら反射処理する
// 平板か角かで処理が異なるがいずれも速度をいじる「だけ」で面倒なめり込み処理は行なわない
// それをやって速度が場合によっては変化してからブロック群と衝突判定
// 具体的にはやはり速度足したときのcolliderがぶつかるかどうか見る
// それでぶつかるなら速度を変える、やはり平板か角かで処理を分けるが・・
// アクションについてもいろいろ。たとえばブロックが壊れるとか1UPするとか
// そしてやはり速度をいじる「だけ」でめんどくさいめりこみ処理は行なわない。
// もろもろのあと速度によりボールの位置を更新して終了。colliderのupdateも忘れずに・・
// っていっても使うのって速度足したやつのcolliderじゃん、やっぱ使えねぇ・・collider要らないかも？
// wとhとxとy(というかleftとtop)があればいい気がしてきたわ（そうです）
// そのあとエフェクトのアップデート、これはstageDataがplayの配下としてあってこれをupdate,
// stageDataのブロック群でmustのものがひとつもなくeffectsも空っぽならクリア判定。以上。

// colliderはやっぱ円判定で互いに動き回っていてこそよね

let mySystem;
const CANVAS_W = 480;
const CANVAS_H = 400;

// KEYCODE変数
const K_ENTER = 13;
const K_RIGHT = 39;
const K_LEFT = 37;
const K_UP = 38;
const K_DOWN = 40;
const K_SPACE = 32;

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

// 今回用意するstateは
// title, select, mode, eyecatch, start, play, pause, gameover, clear, allclear.
// allclearはすべてのstageをクリアしたら～みたいなやつ
// それぞれTitle, Select, Mode, Eyecatch, Start, Play, Pause, Gameover, Clear, Allclearという名前のクラスで
// 遷移については図を参照（こっちにも書くか）
// Modeでは難易度を選択する。パドルの長さ、初期ライフの大きさについて。
// eyecatchでステージシードを作りそれをstart経由でplayに渡して残機が続く限りそれを使って使いまわして
// ブロック全部壊したらクリアで全部クリアしたらタイトルに戻す
// てな感じで
class System{
	constructor(){
		this.state = {title:new Title(this), select:new Select(this), mode:new Mode(this), eyecatch: new Eyecatch(this), start: new Start(this), play: new Play()};
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
	systemSetup(difficulty){
		// レベル開始時に1回だけやる処理
		this.state.start.initialize(difficulty); // パドル画像を用意しつつボールの状態を元に戻して
		this.state.play.initialize(difficulty); // ライフを設定しつつスコアを0に
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
  keyAction(code){}
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
		// ボールが跳ね回ってて文字に当たるとすこしずつ薄くなっていくとか
		// 当たるたびになんかパーティクル出すとかしたら面白いかも
		this.gr.text("BLOCKBREAK", CANVAS_W * 0.5, CANVAS_H * 0.33);
		this.gr.textSize(40);
		this.gr.text("PRESS ENTER KEY", CANVAS_W * 0.5, CANVAS_H * 0.6);
	}
	prepare(_state){}
  keyAction(code){
    // エンターキー押したらセレクトへ
    if(code === K_ENTER){
      this.setNextState("select");
    }
	}
	update(){}
	draw(){
		image(this.gr, 0, 0);
	}
}

class Select extends State{
	constructor(_node){
		super(_node);
		this.name = "select";
		this.mode = 0;
		this.choiceLength = 6; // 0:TO TITLE, 1～5:ステージ（EXTRAも21～25として最初から解禁とする）
		this.txt = ["TO TITLE", "STAGE 01～05", "STAGE 06～10", "STAGE 11～15", "STAGE 16～20", "STAGE 21～25"];
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
		// モード変数を0に戻さないと
		this.mode = 0;
	}
  keyAction(code){
    // 上下キーで選択、エンターキーでtitleまたはmodeに移行
    switch(code){
      case K_UP:
        this.mode = (this.mode + this.choiceLength - 1) % this.choiceLength;
        break;
      case K_DOWN:
        this.mode = (this.mode + 1) % this.choiceLength;
        break;
      case K_ENTER:
        if(this.mode === 0){
          this.setNextState("title");
        }else{
          this.setNextState("mode");
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
		col[this.mode] += 255;
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
class Mode extends State{
	constructor(_node){
		super(_node);
		this.name = "mode";
		this.base = createGraphics(CANVAS_W, CANVAS_H);
		this.level = 0; // selectからレベルの情報を受け取る。playに渡す。
		this.levelText = ""; // STAGE--～--のテキストをコピーする感じ
		this.mode = 0; // playのdifficultyとなる値。modeという名前になってるのは、要するに選択画面では常に"mode"という名前を使うってだけの話。
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
		this.mode = 0;
		// ModeにはSelectからしか来ることができないのでlevelをここでSelectの情報を元に設定
		this.level = _state.mode; // 1～5
		this.levelText = _state.txt[this.level]; // それに応じたテキスト
	}
  keyAction(code){
    // 上下キーで選択、エンターキーでselectまたはplayに移行
    switch(code){
      case K_UP:
        this.mode = (this.mode + this.choiceLength - 1) % this.choiceLength;
        break;
      case K_DOWN:
        this.mode = (this.mode + 1) % this.choiceLength;
        break;
      case K_ENTER:
        if(this.mode === 0){
          this.setNextState("select");
        }else{
					// このタイミングでやること
					// 1.playに難易度に応じたライフを用意させてスコアを0に戻す
					// 2.startに難易度に応じたパドルを用意させる
					// いずれもSystemにやらせる
					this.node.systemSetup();
          this.setNextState("eyecatch");
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
		col[this.mode] += 255;
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

// ステージ開始前のスポットみたいなやつ
// まあステージ番号コールするだけ
// ここでステージデータを作っちゃう（Startに渡してPlayにも渡す）
// データはクラスの形にすべきかな
// シードはjsonか画像データかまあ別に作ってそれを元にデータを生成する流れ
// Modeからの場合はstageNumberをlevel * 5 - 4で計算（1,6,11,16,21）,difficulty情報をmodeから取得
// Clearからの場合はそのままでOK. difficultyはmodeから来た時に設定された値がそのまま保持されているし、
// このあとStart経由でplayに設定されたらクリアかオーバーまでずっと保持されるから設定の必要なし。
class Eyecatch extends State{
	constructor(_node){
		super(_node);
		this.name = "eyecatch";
		this.stageNumber = 0; // 1～25
		this.difficulty = 0; // 1～4
		this.frame = 0;
	}
  drawPrepare(){
		this.gr.textAlign(CENTER, CENTER);
		this.gr.textSize(64);
		this.gr.textFont(huiFont);
		this.gr.fill(255);
	}
	prepare(_state){
		switch(_state.name){
			case "mode":
			  this.stageNumber = _state.level * 5 - 4;
				this.difficulty = _state.mode;
				break;
			case "clear":
			  this.stageNumber = _state.stageNumber;
				break;
		}
		this.frame = 0;
	}
  keyAction(code){
		// 自動的に移行するので操作は無し
	}
	update(){
		this.frame++;
		if(this.frame == 60){ this.setNextState("start"); }
	}
	draw(){
		this.gr.background(0);
		this.gr.text("STAGE" + this.stageNumber, CANVAS_W * 0.5, CANVAS_H * 0.5);
		image(this.gr, 0, 0);
	}
}

// ここでステージナンバーを元にステージデータを生成し
// それに基づいて描画させる。ステージデータはgraphicを受け取りそこにブロックを追加で描画するだけの処理。
// ステージデータのブロック画像から切り貼りするだけだからgrへの操作は不要。imageしか使わない。
// eyecatchからくる場合とplayから来る場合（やられたとき）があるがステージ生成処理はeyecatchから来るときだけ行なう（当然ね）
// どっちからくるにしても初期化処理を行なう（難易度に応じて）. paddleとか画像もcolliderも異なるので。位置とかも。

// とりあえずstagedataにダミー入れてテストだわね
// ここから先はもろもろ用意しないとどうしようもないな
class Start extends State{
	constructor(_node){
		super(_node);
		this.name = "start";
		this.data = undefined;
		this.stageNumber = 0;
		this.difficulty = 0;
		this.ball = new Ball(); // パドルと一緒に動くだけ。発射時に位置情報をplayに渡す
	  this.paddle = new Paddle(); // パドルはマウスと一緒に動く。発射時に位置情報を以下略. 難易度情報は初めに1回だけセットする
	}
	initialize(difficulty){
		this.ball.initialize(difficulty);
		this.paddle.initialize(difficulty);
	}
  drawPrepare(){}
	prepare(_state){
		switch(_state.name){
			case "eyecatch":
			  this.data = new Stagedata(_state.stageNumber); // stageNumberによりステージを生成。
				this.stageNumber = _state.stageNumber; // まあdataに入ってるけど一応ね
				this.difficulty = _state.difficulty; // 難易度が無いとパドルを作れない
				break;
		}
		// どっちからくるにしてもresetは必須
		this.ball.reset();
		this.paddle.reset();
	}
  keyAction(code){
		// マウス操作だから特に・・
	}
	update(){
	}
	draw(){}
}

// PlayにはMode,Pause,Clearからくる可能性があるわけです。
// PlayからはPause,Gameover,Clear,Allclearに行きます。
// 最初に準備段階があってその間は・・うーん。ステージコールは別ステートにするか・・情報だけ付与して。その方がdraw場合分けしなくて済む。
// あと発射段階って絵面はPlayのやつ横取りすればいい、Pauseみたいに。で、パドル動かしてボール・・そうね・・
// じゃあEyecatchとStart作るか。

// 思ったけどStartからボールとパドル互いに受け渡す形でいいんじゃ・・？？そうしよう。
class Play extends State{
	constructor(_node){
		super(_node);
		this.name = "play";
		this.life = 0; // ゲームオーバーに移行するかどうかの指標
		this.score = 0; // スコア
		this.ball = undefined; // Startにもらう
		this.paddle = undefined; // Startにもらう
		this.data = undefined; // Startから来た時にデータをもらう。データはStartでeyecatchから来た時作ったものを交互に受け渡す形。
	}
	initialize(difficulty){
		// レベル開始時に1回だけやる処理。ライフの設定とスコアのリセット。
		let lifeArray = [0, 3, 5, 10, 15];
		this.life = lifeArray[difficulty];
		this.score = 0;
	}
  drawPrepare(){}
	prepare(_state){}
  keyAction(code){}
	update(){}
	draw(){}
}

class Gameover extends State{
	constructor(_node){
		super(_node);
		this.name = "gameover";
	}
  drawPrepare(){}
	prepare(_state){}
  keyAction(code){}
	update(){}
	draw(){}
}

class Clear extends State{
	constructor(_node){
		super(_node);
		this.name = "clear";
	}
  drawPrepare(){}
	prepare(_state){}
  keyAction(code){}
	update(){}
	draw(){}
}

class Allclear extends State{
	constructor(_node){
		super(_node);
		this.name = "allclear";
	}
  drawPrepare(){}
	prepare(_state){}
  keyAction(code){}
	update(){}
	draw(){}
}

// ボール、パドル、ブロック

// ボール
// 大きさは全部一緒でStart用とPlay用に2つインスタンス作る。Startの方はボールが発射されるまで表示
// サイズ16x16 円だけど判定はrectで行なう。その方が楽。
// スピードは通常時が4で加速時が6だそうです
class Ball{
  constructor(){
		// x, yは左上の座標
		this.x = 0;
		this.y = 0;
		this.speed = 4; // speedとdirectionで位置更新するか
		this.direction = 0;
		this.grList = createGraphics(32, 16); // すべてのグラフィック（2通りしかないけど）
		this.gr = createGraphics(16, 16); // 現在のグラフィック
		this.wait = true; // フラグ。trueならstart中ということ、falseならplay中ということ。
		this.alive = true; // フラグ。下に落ちた時にtrueとなりやられた判定が発生してStartに戻る流れ。
		this.paddleWidth = 0; // パドルの幅情報がないといろいろと不便
		this.prepareGraphics();
	}
	initialize(difficulty){
		// 位置ねぇ・・wait中はマウス位置によるからまあいいや。
		// 発射時のあれこれはStartがボールに指示出すのでいいです
		// Startにくるたび必ずやる処理をresetという形で分離する
    this.reset();
		// 難易度が絡むところだけが異なる。ほぼほぼreset.
		let wArray = [0, 80, 60, 40, 30];
		this.paddleWidth = wArray[difficulty];
	}
	reset(){
		// この辺はStartにくるたび毎回やる
		this.speed = 4;
		this.direction = 0;
		this.alive = true;
		this.wait = true;
	}
	prepareGraphics(){
		// グラデするかもだけど
		this.grList.noStroke();
		this.grList.fill(255); // 白で
		this.grList.circle(8, 8, 16);
		this.grList.fill(255, 0, 0); // アクティブ時は赤で
		this.grList.circle(24, 8, 16);
		this.gr.image(this.grList, 0, 0, 16, 16, 0, 0, 16, 16);
	}
	update(){
		if(this.wait){
			// wait中はマウス位置に勝手に移動
			this.x = mouseX - 8;
			this.x = constrain(this.x, this.paddleWidth * 0.5 - 8, CANVAS_W - this.paddleWidth * 0.5 - 8);
			this.y = CANVAS_H - 5 - 16;
		}else{
		  // 速度更新の前に・・ん－。更新前に衝突関連処理行なうので注意ね
			// play中は衝突もろもろのあとで速度足すだけです
		  this.x += this.speed * Math.cos(this.direction);
		  this.y += this.speed * Math.sin(this.direction);
		}
	}
	draw(gr){
		// grに画像を貼り付ける
		gr.image(this.gr, this.x - 8, this.y - 8);
	}
}

// パドル
// 難易度により大きさと色を変える、これもStartとPlayで2つインスタンス
// ボールと衝突判定する。なおブロックの配置の都合上ブロック・・あー、まあ、いいや。
// 横幅：80,60,40,30.縦の長さは5です
class Paddle{
	constructor(){
		this.x = 0;
		this.y = 0;
		this.w = 0;
		this.h = 5;
		this.difficulty = 0; // 難易度情報。これがないと画像チェンジのときに困る
		this.active = false; // 左クリックでアクティブ化
		this.count = 0; // アクティブ状態の持続時間は30フレーム
		this.grList = createGraphics(80, 40);
		this.gr = undefined;
		this.prepareAllGraphics();
	}
	prepareAllGraphics(){
		// パドルの全体画像の用意
		// とりあえず白と赤で
		this.grList.noStroke();
		this.grList.fill(255);
		this.grList.rect(0, 0, 80, 5);
		this.grList.rect(0, 5, 60, 5);
		this.grList.rect(0, 10, 40, 5);
		this.grList.rect(0, 15, 30, 5);
		this.grList.fill(255, 0, 0);
		this.grList.rect(0, 20, 80, 5);
		this.grList.rect(0, 25, 60, 5);
		this.grList.rect(0, 30, 40, 5);
		this.grList.rect(0, 35, 30, 5);
	}
	initialize(difficulty){
		this.reset();
		// difficultyは1～4で難易度に対応
		let wArray = [0, 80, 60, 40, 30];
		// difficultyプロパティはクリックでアクティベートするときに切り替え（30フレームの間アクティブになる）
		this.difficulty = difficulty;
		this.w = wArray[this.difficulty];
		this.gr = createGraphics(this.w, this.h);  // ここに落とす
		// this.grListから切り抜いてthis.grに落とす
		this.gr.image(this.grList, 0, 0, this.w, this.h, 0, 5 * (this.difficulty - 1),this.w, this.h);
		this.prepareGraphics();
		// 位置関連はいいや。どうせマウス位置に勝手に移動するんだから。
	}
	reset(){
		// Startにくるたびに毎回やるのはこんなところかな
		// 他にやることないだろ
		this.active = false;
		this.count = 0;
	}
	prepareGraphics(){

	}
	update(){
		this.x = mouseX - this.w * 0.5;
		this.x = constrain(this.x, 0, CANVAS_W - this.w);
		this.y = CANVAS_H - this.h;
		if(this.active){ this.count--; if(this.count === 0){ this.active = false; } }
	}
	draw(gr){
		gr.image(this.gr, this.x, this.y);
	}
}

// ブロック
// 画像は生成時に設定される。データを持ってるのはStagedataクラスで、そっちで設定する感じ。
// a0～a4(2x1), b0～b4(1x2), c0～c4(1x1), d0～d4(2x2)が通常ブロックでタフネスにより色が異なる
// ぶつかるたびに薄くなっていく、黄色、オレンジ、赤、紫、青の順でつよい
// e0～e2(2x1)は緑、黄緑、スカイブルーでこれらは強くぶつけないと薄くならない
// f0～f2(1x2)は縦バージョン
// g(2x1)とh(1x2)は1UPです。1回普通に当てただけでライフが回復します。
// i0～i9とj0～j9はそれぞれ1x1～1x10と1x1～10x1です（1x1がかぶってるけど気にしない）
// あと壁のkとlですべて。これらがブロック要素の画像のすべてとなります。
// 面倒なので生成時に画像渡しちゃおう（そうしよう）
class Block{
	constructor(x, y, _type, gr){
		this.x = x;
		this.y = y;
		this._type = _type; // a0とかd4とかkとか
		this.tough = 0; // HPに相当する値。壊せない場合はInfinityを設定。
		this.must = true; // 壊すべきか否か。これがtrueのものをすべて壊すことがクリアフラグ条件の半分（もう半分はエフェクト）
		// エフェクトは後で作るのでとりあえずはmust==trueをすべて壊す、でOK. 作らないことにはどうしようもないので。
		this.setTough();
		this.gr = gr;
	}
	setProperty(){
		// _typeに基づいてタフネス値や壊すべきかどうかのフラグを設定
	}
}

// Rectcollider
// 長方形領域。ボールとかブロックとかパドルに持たせる
// これを使ってcalc_far(遠くにあるときは判定しないやつ)とか衝突した時の・・
// 位相はぶつかった時だけ計算すればいいと思うんだ・・（ballposのところを読みながら）ねぇ？無駄が多いなぁ。困ったもんだ。
// calc_farも要らない気がする。次のフレームの位置に対してそれが衝突しない感じならスルー、衝突する感じなら
// そのときに移動前の情報により位相を計算しそれに応じて・・
// めり込みの処理をしてない！？でも普通に動いてるな・・速度更新の前に次の位置がめり込む場合に衝突と考えて
// 反射もろもろ処理してる。それで動いてるんだからすごいな。まあいいか（？）
// めりこみめっちゃ苦しんだ過去があるから複雑な気持ちもあるけど深く考えないことにする。ボール大きいしその辺でバランス取ってそう。
// ブロック崩しって見かけによらずほんとにバグらない実装難しくて、これもパドルがめちゃ低い位置あるけど以前はちょい上の方だったし
// パドルも太かった。それでやったらボールが壁とサンドイッチされる致命的なバグが発生して自由なステージ作りがしづらくなった。
// だから諦めた経緯がある。まあいいです。じゃあtopとかそこら辺、centerとか、そういう情報保持のためのクラスってことで。
// updateしながら。それでいこう。衝突はいつものようにpreviousを使って・・そうするとrect要らんけどな！
// あ、colliderにpreviousの概念用意する？違う、ballにpreviousのcolliderで二重で用意すればいいや。
// ブロックは動かないしpaddleのupdateのあとでballのupdateやってる。順番がはっきりしてるなら迷うことは何もないな。
// 単純なロジック。楽勝でしょう。
// ・・・・・
// 一旦、なくすか

// ステージデータ
// ブロック構成に関する完全なデータ
// どの種類のブロックがどんだけあるとか
// それを元に毎フレーム描画するみたいな感じのあれ
// たとえば壊したりしたらそれをもとに更新する、ブロックもクラスなので
// つまりブロックの配列が入ってて描画はそれ使うんだけどそれだけの話で、うん。
// ブロック残り数とかいろんな情報が包含されててこれのプロパティを見てクリアしたかどうか判定する
// 種をもとに初期化
// Systemに持たせてそこから引っ張ってくる感じ
class Stagedata{
	constructor(seed){
	}
}

function keyPressed(){
  mySystem.currentState.keyAction(keyCode);
	return false;
}
