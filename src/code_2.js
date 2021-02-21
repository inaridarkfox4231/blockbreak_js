// @yuruyurauさんのコード集

// これどうして動くのか調べて欲しいとか。なんか正十二面体が工場みたいな
t=0,draw=(T=translate,X=rotateX)=>{clear(t++||createCanvas(800,350,WEBGL));T(-470-t%150,-40);
  for(n=16;push(),n--;pop(),T(0,39),sphere(30,4,2),T(n&1||150,39),X(PI))for(r=9;r--;
  rotateY(r%2*1.26+PI))T(0,0,24),X(-1.1*(n/2>4||n/2>3&&t/150%1)),T(0,0,24),cone(30,0,6)}
// 変な星型的な
y=60,t=0,draw=(T=translate,X=rotateX,Y=rotateY)=>{t++||createCanvas(450,450,WEBGL);background(9);
  y+=sin(b=(a=t*PI/100)+sin(a*2)/2)*2;Y(b/2);X(b/2);for(r of[0,0,3,4,1,4,1,4,1,4,1,2])
  Y(PI+TAU/5*r),T(0,y/2,50),X(1.107),T(0,-y/2,50),cylinder(124,y/3,6,13,1,0)}
// 正二十面体の展開図的な
t=0,draw=(T=translate,X=rotateX,Y=rotateY)=>{clear(t++||createCanvas(600,270,WEBGL));Y(PI/40*t*((d=t/40)%6>2));
  X(PI/2);for(r of[0,0,3,4,1,4,1,4,1,4,1,2])Y(TAU/5*r),T(0,-6,-26),X((d%12<6?-1.1:1.1)*((f=d%6^0)>1?1-d%1*(f==5):d%1*f)),
  T(0,6,-26),Y(PI),cone(32,13,6)}
// 星型八面体の展開図的な
t=0,draw=(T=translate,X=rotateX)=>{clear(t++||createCanvas(600,330,WEBGL)+ortho());rotate(PI/50*t*((d=t/50)%6>2),
  [1,1,0]);X(PI/2);T(0,46);for(r of[1,5,1,1,5,1,5,5])rotateY(PI/3*r),T(0,-20,20),X(1.23*((f=d%6^0)>1?1-d%1*(f==5):d%1*f)),
  T(0,20,20),cone(40,40,4,9)}
// 立方体が出来たりばらけたり
t=0,draw=(T=translate)=>{t++||createCanvas(400,400,WEBGL);background(2,1,6);T(0,-150);
for(n=15;push(),n--;pop(),T(0,20),rotateY(PI))for(r of[1,4,3,0,0,1])rotate(PI/2*r),T(0,5),
rotateX(PI/2*((f=(b=t/50+n)%9^0)>5?1-b%1*(f==8):f>4&&b%1)),T(0,5),square(-5,-5,10)}
// 路線図みたいな
t=0,draw=($=randomSeed(97))=>{t++||createCanvas(540,300,WEBGL);background(0);rotateX(1.3);box(1100,600,5);
  translate(30,80,3);for(i=2e3;i--;)(a=random(40))<7&&rotate(PI/2*(a|0))||a<8&&box(a*2,4)||a<8.2&&sphere(a),i%3||box(12,2),
  translate(4,0),(t+i)%100||box(5)}
// サッカーボールだって
t=0,draw=$=>{t++||createCanvas(540,540,WEBGL)/noFill();background(251);rotateY(PI/300*t);for(b=2;b--;)
  for(a=10;push(),a--;pop())rotateY(TAU/5*a).rotateX(PI*b+.553).translate(0,0,222).rotate(PI*(a&1)).rotateX(.364),
  ellipse(0,-79,183,183,6)}
// 正二十面体
a=105,b=170
t=0,draw=(X=rotateX)=>{t++||createCanvas(540,540,WEBGL)&noFill();background(248);X(t*.03);for(n of l=[-1,1])
  for(g=atan(b/a),m=10;m>9||X(g),beginShape(),m--;endShape(CLOSE),X(PI-g),rotate(TAU/5*(m&1))){for(c of l)vertex(a*c,0,b);
    vertex(0,-b*n,a)}}

// 時間ないし重いのは全部無視しよう。軽いのだけ解析しよう。
// 上に描いたやつそれなりに全部軽いから調べるに値する。

// メンガースポンジのルービック変形。重いから無視していいよ
t=0,draw=$=>{createCanvas(540,540,WEBGL);rotateX(t++*(a=PI/50)/3+(t/25&1)*PI/2);
  (F=n=>n<8&&box(n*3)||((x,y)=>{for(x of l=[-1,0,1])for(y of l)for(z of l)push(),y+1==(t/50%3^0)&&n>79&&rotateY(t*a),
    translate(x*n,y*n,z*n),x&y|x&z|y&z&&F(n/3),pop();})())(80)}
// これも多分ルービック変形型だけど重いから無視していいかも
t=0,draw=$=>{t++||createCanvas(540,540,WEBGL);background(248);rotateY(t*(e=PI/25)/6);t/25&1||rotate(PI/2);
  (F=n=>n<1&&box(n*3)||(x=>{for(x of l=[-1,0,1])for(y of l)push(),x+1==(t/25%3^0)&&n==s&&rotateX(t*e),
    translate(x*n,y*n),x&y||F(n/3),pop();})())(s=120)}
