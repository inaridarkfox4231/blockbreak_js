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

// 800x600にしてステージごとに大きさを変える、で、ライフとスコアはそれに応じた位置に表示する、的な？
// 今、全体の大きさが440x400でやってて、それに対して壁、があって、って感じ。つまり、
// で、それを円形とか、両サイドとかにする場合、stageseedにその情報を入れて、playに渡して、スコア描画とか
// やる際の参考データにする必要があるってわけね。
// ブロックの配列は直接渡していいけどstageDataそのものも必要だと思うんだ。うん。
// 背景画像を別に用意して、それもplayと共有しつつ・・それの上に黒でエリア、で、画面外にライフとスコア、
// 黒の地にブロックを配置して・・ガーターね。とげでいい。三角。20x20の三角。それをずらっと。
// それと別にパドルの移動データ。というか、マウス位置(x,y)をパドル位置に変換する関数、ね。それのコードみたいな。
// 番号だけ指定しておいて具体的な指示はこっちで変換するからそれを使うのだよ。グローバルに用意しておいて。

// とはいえ、今もういろいろ準備しちゃったから800x600にするのは後回しでいいよね。疲れちゃう。

// ばかばかしくなってきたので合理的に考えよう。これじゃ一生出来上がらない。
// 絵面とかとりあえずどうでもいいから合理的に考えてよ。
// まず
// ノーマルブロック
// 色は青系で統一(HSB=65)。タフネスで色の濃さ指定(20, 40, 60, 80, 100)。薄い→濃いで1～5.つまりぶつけるほどうすくなってく、濃いのはつよい。
// ハードブロック
// 色は赤系で統一(HSB=0)。薄い→濃いで2,4,6. (20, 60, 100)
// ライフアップブロック
// 色はピンク(HSB=87)で当てると1ライフ回復
// ウォールブロック
// 色は灰色で壊せない。
// グラフィックは用意しない。タイプとタフネスで描画内容を完全に指定する。以上。
// とりあえず外周を灰色で覆うくらいはしないと隣接ブロックを区別できないけどね・・
// ていうかHSBのSを半分にしてベース、Bを半分にして・・くらいはいいんじゃない。

// wとhは事前に設定
// createGraphicsも実行済み
// 作るのはブロックそれ自体に対してtypeとtoughに応じて画像を提供する関数
// グローバルの
// それを用意して衝突でタフネスが減るたびに基本のHSBに対してさっきみたく形を与える感じで。
// 灰色とかはだから最初に用意してそれっきりね。
// それでいこう。

// State一覧
// Title, SelectLevel, SelectMode, Play, Pause, Gameover, Clear(AllClear)で全部

let mySystem;
const CANVAS_W = 600;
const CANVAS_H = 600;

// KEYCODE定数
const K_ENTER = 13;
const K_RIGHT = 39;
const K_LEFT = 37;
const K_UP = 38;
const K_DOWN = 40;
const K_SPACE = 32;

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
		this.choiceLength = 6; // 0:TO TITLE, 1～5:ステージ（EXTRAも21～25として最初から解禁とする）
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
		this.levelText = _state.txt[this.level]; // それに応じたテキスト
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
          this.setNextState("select");
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

// というわけでバッサリカット。EyecatchとStartは要らないということで。

// PlayにはMode,Pause,Clearからくる可能性があるわけです。
// PlayからはPause,Gameover,Clear,Allclearに行きます。
// 最初に準備段階があってその間は・・うーん。ステージコールは別ステートにするか・・情報だけ付与して。その方がdraw場合分けしなくて済む。
// あと発射段階って絵面はPlayのやつ横取りすればいい、Pauseみたいに。で、パドル動かしてボール・・そうね・・

// Modeからくる
// Modeから来た時のstageNumberはlevel*5-4で最終的にlevel*5までいく
// lifeとscoreについては基本的にgameSystemの方でいろいろやる
// stage==0に場合にスコアリセットとライフ設定を行なう（1以上のときはしない）
class Play extends State{
	constructor(_node){
		super(_node);
		this.name = "play";
    this.gameSystem = new GameSystem();
		this.level = 0;
		this.stage = 0; // 0,1,2,3の場合は1つ増やして4の場合は次へ。
		this.mode = 0;
		this.offSetX = 0; // gameSystem.grをこっちのgrに貼り付ける際のオフセット。とはいえまあ単純に
		this.offSetY = 0; // gameSystem.grが中央にくるように計算で出すんだけどね。widthとheight分かるし。
		this.clickActionWaitCount = 0; // 32
	}
	calcOffSet(){
		let ggr = this.gameSystem.gr;
		const w = ggr.width;
		const h = ggr.height;
		this.offSetX = (CANVAS_W - w) * 0.5;
		this.offSetY = (CANVAS_H - h) * 0.5;
		// これでいい。
	}
  drawPrepare(){
		// といってもメイン描画はgameSystem側でやるので、ここではせいぜい背景をあれするくらい。
		// レンガとか三角形とか青海波とかモノクロで並べたら面白そう。工字繋ぎとか。
		this.gr.clear(); // もうしわけていどに
	}
	prepare(_state){
		switch(_state.name){
			case "selectMode":
			  this.stage = 0;
				this.level = _state.level;
				this.mode = _state.choice - 1; // 1～4で変換して0～3にする感じ
				this.gameSystem.setPattern(this.level, this.stage, this.mode); // initialize()とかもろもろもここでやる感じ
				this.calcOffSet(); // ここでオフセットを計算
			  break;
			case "clear":
			  // this.stage++して5より小さい時こっちに飛ばされる。
			  this.gameSystem.setPattern(this.level, this.stage, this.mode); // はじめに来た時と同じように初期化
			  break;
			case "pause":
			  break;
		}
	}
  keyAction(code){
		// Playにおいてキーで何か操作することはないかな・・ていうか十字キーでパドル動かすの辛いんだよ、ほんとに。
		// それが嫌でマウスにした経緯がある。難しいステージが作れないからってことで。マウスなら自由自在だから。その分難しくできる。
	}
	clickAction(){
		if(this.clickActionWaitCount === 0){
			// きちんと実行できたらtrueを返す
			if(this.gameSystem.clickAction()){ this.clickActionWaitCount = 32; }
		}
	}
	update(){
		if(this.clickActionWaitCount > 0){ this.clickActionWaitCount--; }
		this.gameSystem.update();
	}
	draw(){
		this.gameSystem.draw();
		this.gr.background(0);
		this.gr.image(this.gameSystem.gr, this.offSetX, this.offSetY);
	}
}

class Pause extends State{
	constructor(_node){
		super(_node);
		this.name = "pause";
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

class Score extends State{
	constructor(_node){
		super(_node);
		this.name = "score";
	}
  drawPrepare(){}
	prepare(_state){}
  keyAction(code){}
	update(){}
	draw(){}
}

// ゲーム関連もろもろはここに統一させる
// エディタではブロックを置ける場所にブロックを置くだけ。プリセットも用意しておく。数多くないし楽でしょ。
class GameSystem{
	constructor(){
		this.level = 0;
		this.stage = 0;
		this.mode = 0;
		this.score = 0;
		// this.life = 0; // ライフはボールに持たせる
		// ゲームの要素
		this.paddles = []; // 0番にボールを乗せるパドルを設置する感じで。
		this.ball = new Ball();
		this.blocks = [];
		this.gutter = new Gutter(); // こっちのgrにガターを描画する関数と、ボールをアウトにする判定関数持ってる。
		this.gr = undefined; // データを元にgrを作って・・
		this.openingAnimationSpan = 0; // これが正の間にスタート時のアニメを完了させる（60フレーム）
		// これはもうあれ、アップデートとか後回しで、うん。。そうしよう？
	}
	initialize(mode){
		// レベルの最初に行なう処理
		this.score = 0;
		this.mode = mode; // モードを設定
		const lifeArray = [3, 5, 10, 15];
		this.ball.setLife(lifeArray[mode]);
	}
	clickAction(){
		if(this.openingAnimationSpan > 0){ return false; } // 実行出来なかったのでfalseを返す
		// ゲームシステムにおけるアクション。えーと、具体的には「発射」と「パドル活性化」です。
		// 複数の場合は全部いっぺんに活性化する。全部いっぺんに色が変わる。
		return true;
	}
	setPattern(level, stage, mode){
		if(stage === 0){ this.initialize(mode); } // ここでやるのはパドル用意するとかそういうの
		this.paddles = [];
		this.blocks = [];
		// 与えられたwとhに基づいてthis.grを生成してね！！
		this.gr = createGraphcis(480, 420); // とりあえずね。420は360+60です。python版が440x400(=360+40)ベースなので。
		// パドルを作ってね（パターンごとに固定）
		// マウス位置を実際の位置に変換する関数が要る
		// LinePaddleとArcPaddleの2種類を作るつもり。マウス位置をパラメータに変換し、パラメータを元に描画し(gr渡して描かせる)、
		// パラメータを元にボールとの衝突判定をし速度を変更する。それら3種類の関数と、modeによる長さ指定、これで生成する。
		// とりあえずLinePaddleだけ作ります
		// 衝突についてはパラメータの情報を元に、ボールの情報と合わせて、パドル側で、やります。
		// 温泉入ってるときに頭の中でちゃちゃっとね、まあ実装は、大変でしょうね・・・
		this.paddles.push(new LinePaddle(mode, setParamFunc, drawFunc));
		// ボールをいじってね. ボールが落ちるたびにパドルに再配置する、その際にマウス位置に応じて動くんで、それをね・・
		// パドルに対してだといろいろと問題があるので個別の関数で動かしちゃおう。まあ、似たようなのを渡すわけさ・・
		// ボールもgr渡して描かせる
		this.ball.initialize(setPosFunc);

    // パドルとボールの移動関数はmodeによる。modeの情報を元に関数を作り渡せばよい。
		// だからボールがパドルの幅情報を持つ必要もないわけね。

		// ブロック用意してね（パターンごとのブロックとエディタで編集できるのとそれぞれ）
		// まずNORMALかLIFEUPかWALLか指定、まあ基本WALLだけども。
		// gridX,gridY,gridW,gridH,blockType(=WALL),tough(=Infinity)って感じ。
		// つまりWALLが多いので、ほとんどはWALLでInfinity, そうでないのをね、あれする。gridSizeは20だからそれで割った値を指定してる。
		// で、絶対座標です。なので基本gridYは3以上となります。上60は予約スペースなので。
		// NORMALをすべて壊したらクリアですね。WALLは壊せないし、LIFEUPは壊さなくてもOKです。
		// ブロックとボールの衝突判定はGameSystem側が持ってる関数を使います。その結果については・・hit関数を
		// それぞれに持たせて（ボールとブロックに持たせて）対処。いろいろ起こるので。
		// ブロックもgr渡して描かせる（おい）
		this.blocks.push(new Block(0, 3, 1, 18), new Block(23, 3, 1, 18), new Block(1, 3, 22, 1),
		                 new Block(7, 7, 2, 1, NORMAL, 1));
		// ガター用意してね。描画のための関数と、あ、gr渡して描かせるの。checkFuncは要するにもろもろ、速度更新、移動させた後で
		// ガターとぶつかるようならそこでアウトの判定を出してもらうわけね。
		this.gutter.initialize(drawFunc, checkFunc);
		// おけ！
		this.openingAnimationSpan = 60; // これが0になってからもろもろ始まる感じで。
	}
	update(){
		if(this.openingAnimationSpan > 0){ this.openingAnimationSpan--; return; } // 0になるまでこれしかやらない
		this.paddles.update(); // パドル動かすならここでね
		// パドルを動かします（
	}
	draw(){
		// やることいっぱい
		// 黒で初期化
		// 上の方にライフとスコアとステージ番号描画
		// ライフはバーの長さで表現し0になったら終わり、
		// 縦60で横はステージ幅
		// 30ずつにわけて左上に0-0とか4-3とかステージ、左下にスコア、その右側スペースにライフ（30x30の白い円を2列に並べる）
		// ライフの円は12個まで並べたら下の段、まあそんな増えないだろうけど。調整します。（24個までしか置けないように）
		// 横幅の下限が480だからスコアとステージに120くらい割いて残り360でそれをやる。数字は18x30だから108x30でおけ。
		// SCOREの文字は入らないので数字だけ。あと空欄は0で埋める、あとその上に[4-4]って感じでやるね。
		// ガター描画 → ブロック描画 → パドルたち描画 → ボール描画 で、おわり？
		// 基本はそれだけ。
		if(this.openingAnimationSpan > 0){
			this.gr.background(0);
			this.gr.textSize(64);
			this.gr.textAlign(CENTER, CENTER);
			this.gr.text("STAGE 0-0", this.gr.width * 0.5, this.gr.height * 0.5);
			return;
		}

	}
}

// ボール、パドル、ブロック

// ボール
// 大きさは全部一緒でStart用とPlay用に2つインスタンス作る。Startの方はボールが発射されるまで表示
// サイズ16x16 円だけど判定はrectで行なう。その方が楽。
// スピードは通常時が4で加速時が6だそうです
// 通常時灰色、加速時オレンジ色。加速時はスピード速いからぶっちゃけ色区別要らないし。んー。
// グラフィックは中央に向けて白く。具体的にはfill(255, 128 + i * 8, 0)でi:0～16で半径16～0で。
// 通常時はfill(128 + i * 8)でi:0～16で半径16～0で。最初にリスト用意して切り替える。
class Ball{
  constructor(setPosFunc){
		// x, yはもちろん中心の座標
		this.x = 0;
		this.y = 0;
		this.speed = 4; // speedとdirectionで位置更新するか
		this.life = 0; // ライフはこっち持ちで。アウトになるたびに減らし、0になったらplayの方でゲームオーバー判定する感じ
		this.direction = 0;
		this.grList = createGraphics(32, 16); // すべてのグラフィック（2通りしかないけど）
		this.gr = createGraphics(16, 16); // 現在のグラフィック
		this.wait = true; // フラグ。trueなら待機中ということ、falseなら飛び回ってるということ。
		this.alive = true; // フラグ。下に落ちた時にtrueとなりやられた判定が発生してStartに戻る流れ。
		this.attack = 1; // 攻撃力。速度が変化するときに2になり、戻るときに1になる、みたいな感じで変化。
		this.highSpeedLimit = 0; // ハイスピード状態の持続時間。300フレーム、つまり5秒間が限界ね。
		this.prepareGraphics();
		this.setPosFunc = setPosFunc; // 待機時にマウス位置を存在位置に変換する為の関数。
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
		// グラデするかもだけどそれは後でいい
		this.grList.noStroke();
		this.grList.fill(255); // 白で
		this.grList.circle(8, 8, 16);
		this.grList.fill(255, 128, 0); // とりあえずオレンジで
		this.grList.circle(24, 8, 16);
		this.gr.image(this.grList, 0, 0, 16, 16, 0, 0, 16, 16);
	}
	getLife(){
		return this.life;
	}
	setLife(lifeValue){
		this.life = lifeValue;
	}
  lifeChange(diff){
		// 増やすのも減らすのもメソッド経由で
		this.life += diff;
	}
	setSpeed(_speed){
		this.speed = _speed;
	}
	setDirection(_direction){
		this.direction = _direction;
	}
	update(){
		// wait時はsetPosFuncに従うが飛び出した後は反射で位置が変わる感じ・・んー。
		// 基本的に速度を足す。そして速度は衝突により変化する。ここで速度を足すのはあくまでそのあとってわけね。
		// パドルとの衝突では速度が変化する場合もあるし。
		// wait中ならその処理は無いからsetPosFuncに任せて終わり。
	}
	draw(gr){
		// grに画像を貼り付ける
		gr.image(this.gr, this.x - 8, this.y - 8);
	}
}

// パドル
// 白と黄色。幅は4で統一。で、表示位置とかそこら辺は全部関数渡して解決する流れで。
// パラメータもLinePaddleとArcPaddleで必要なものが全然違うのでそこら辺も含めて。
// LinePaddleの場合は中心座標であと幅。縦だったり横だったり。Arcの場合中心とかいろいろ。
// 当たり判定にしてもLineならrect判定でArcなら円を使う、という風に分けて処理する。
// 要するにステージごとに全然違うから関数渡して個別に処理しちゃおうってわけね。
class Paddle{
	constructor(mode, setParamFunc, drawFunc){
		this.x = 0;
		this.y = 0;
		this.w = 0;
		this.h = 0;
		this.mode = 0; // 難易度情報。これがないと画像チェンジのときに困る
		this.active = false; // 左クリックでアクティブに
		this.count = 0; // アクティブ状態の持続時間は30フレーム
	}
	reset(){
		// Startにくるたびに毎回やるのはこんなところかな
		// 他にやることないだろ
		this.active = false;
		this.count = 0;
	}
	update(){}
	draw(gr){}
}

class LinePaddle extends Paddle{

}

class ArcPaddle extends Paddle{
	
}

// ブロック
// 色は2段階で。？3段階。
// life1:白、life2:薄い青、life3:濃い青。で、通常アタックがダメージ1で、薄い青→白→消える、って感じで。
// それで、高速アタックはダメージ2.lifeが3以上の場合は2以上のダメージを一度に与えないと減らないみたいにする感じで。
// つまり3が1になって白くなるわけね。2回で消える、ただし1回目は高速限定。つまりNORMALとかHARDとか廃止で。
// NORMALとLIFEUPとWALLの3種類とする。
// NORMALはlifeで分けて3段階で白、薄い青、濃い青でLIFEUPはlife1でピンクで黒い字で「L」書く、WALLは灰色で厚みを変える。
// 厚みは2と5で区別。
class Block{
	constructor(gridX, gridY, gridW, gridH, blockType = WALL, tough = Infinity){
		this.x = gridX * 20;
		this.y = gridY * 20;
		this.w = gridW * 20;
		this.h = gridH * 20;
		this.blockType = blockType; // a0とかd4とかkとか
		this.tough = tough; // HPに相当する値。壊せない場合はInfinityを設定。
		// 分裂するかどうかっていうフラグを用意するかどうかって話。
		// 40x40でNORMALでtoughが1のときに通常アタックを受ける、という条件が満たされればspreadFlag = trueとして
		// gameSystem側で排除するときに小さいブロックを4つ追加する形でっていう、そういうの。
		// 応用すれば60x60とかでも・・つまり縦横共に40以上なら何でも、ってやることもできそうな？
	}
	hit(_ball){
		// ボールとヒットした時のあれこれ。ボールが速い時に色々とね・・
		// 面倒でもボールのスピードと攻撃力を区別。まあ、1か2だけど。で、NORMALでダメージ受けると普通に減るが、
		// 3の場合は1では減らず2でないとだめ、です。はい。で、LIFEUPなら_ballのライフ・・？
		// やっぱライフはボールに持たせた方がいいか。うん。でないとめんどくさそう。
		// WALLの場合何も起きない。速度変更はこっちでやらないし。てか速度はタイプに依らず変えるし。
	}
	draw(gr){
		// blockTypeとtoughで異なる。WALLは灰色ベースで太いbevel, NORMALは白か薄い青か濃い青、LIFEUPはピンクベースで。
	}
}

// ガターです
// 赤いのを・・
// シェーダでなんかいじるのもありかなとか思ったり（例のマグマとか）
// そしたら背景は雲とか？
// これクラスの意味あるん？？まあこんなもんでしょ。パターン化できないんだよ。まとめておくってだけの話。
class Gutter{
	constructor(){
		this.drawFunc = () => {};
		this.checkFunc = () => {};
	}
	initialize(drawFunc, checkFunc){
		this.drawFunc = drawFunc;
		this.checkFunc = checkFunc;
	}
	check(_ball){
		// _ballがガターにアレしてるか見て、してたらtrue返してね。してなかったらfalse返してね。
		return this.checkFunc(_ball);
	}
	draw(gr){
		// grにガター描いてよね
		this.drawFunc(gr);
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
