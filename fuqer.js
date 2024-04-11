function LeFuqer(x, y){
    this.x = x;
    this.y = y;
    this.aliveFrames = 0;
    this.clearTextTimeoutId = null;
    this.text = "";
    this.isTalking = false;
    this.update = function(){
        this.aliveFrames++;
        this.offsetY = Math.sin(this.aliveFrames * (PI / 135)) * 5;// -5 to 5 (just for a bobbing effect)
        let targetX = player.x;
        let targetY = player.y;
        let dx = (targetX - this.x) - 4;
        let dy = (targetY - this.y) - 4;
        if(Math.abs(dx) > 16 || Math.abs(dy) > 16){
            this.x += dx * 0.05;
            this.y += dy * 0.05;
        }
    }
    this.say = function(txt){
        clearTimeout(this.clearTextTimeoutId);
        this.clearTextTimeoutId = setTimeout(function(){fuqer.text = "";fuqer.isTalking = false;}, 10000);
        this.text = txt;
        this.isTalking = true;
    }
    this.draw = function(){
        image(spriteDeFuqer, this.x, this.y + this.offsetY, 9, 9);
        if(this.text != ""){
            textSize(12);
            text(this.text, 12, height/SCALE - 12);
        }
    }
}