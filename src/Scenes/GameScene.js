class GameScene extends Phaser.Scene {
    constructor() {
        super("gameScene");

        this.my = {sprite: {}, text: {}};
        this.playerX = 480;
        this.playerY = 435;
        this.maxBullets = 10;
        this.waveLevel = 1;
        this.waveStarting = false;
    }

    preload() {
        this.load.setPath("./assets/");

        //background
        this.load.image("tiles", "tilemap_packed.png");
        this.load.tilemapTiledJSON("map", "DungeonMap.json");

        //player
        this.load.image("player", "player.png");

        //weapons
        this.load.image("sword", "sword.png");
        this.load.image("axe", "axe.png");

        //enemy
        this.load.image("cyclops", "cyclops.png");
        this.load.image("ghoul", "ghoul.png");
        this.load.image("warlock", "warlock.png");
        this.load.image("spider", "spider.png");
        this.load.image("bat", "bat.png");
        this.load.image("ghost", "ghost.png");
    }

    create() {
        let my = this.my;

        this.ui = {
            health: document.getElementById("health"),
            score: document.getElementById("score"),
            wave: document.getElementById("wave")
        };

        // array to hold sprites
        this.my.sprite.bullet = [];
        this.my.sprite.enemies = [];
        this.my.sprite.enemybullet = [];

        this.playerSpeed = 10;
        this.bulletSpeed = 8;

        //tilemap
        this.map = this.add.tilemap("map", 16, 16, 10, 10);
        this.tileset = this.map.addTilesetImage("tilemap_packed", "tiles");

        this.floorLayer = this.map.createLayer("FloorLayer", this.tileset, 0, 0);
        this.floorLayer.setScale(4.0);

        //player
        this.my.sprite.player = this.add.sprite(game.config.width/2, game.config.height - 40, "player");
        this.my.sprite.player.setScale(4.0);

        // Create key objects
        this.left = this.input.keyboard.addKey("A");
        this.right = this.input.keyboard.addKey("D");
        this.nextScene = this.input.keyboard.addKey("S");
        this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.waveChange = this.input.keyboard.addKeys({
            one : Phaser.Input.Keyboard.KeyCodes.ONE,
            two : Phaser.Input.Keyboard.KeyCodes.TWO,
            three : Phaser.Input.Keyboard.KeyCodes.THREE
        });

        //player hitbox
        this.playerHitbox = this.add.rectangle(this.my.sprite.player.x, this.my.sprite.player.y, 50, 50, 0xff0000, 0);

        this.time.addEvent({
            delay: 2000,
            callback: this.throwAxe,
            callbackScope: this,
            loop: true
        });

        this.waves = [
            {
                number: 1,
                enemies: [
                    { type: "cyclops", count: 3, row: 100, speed: 4, score: 25 },
                    { type: "bat", count: 2, row: 200, speed: 10.5, score: 25 },
                    { type: "ghost", count: 4, row: 300, speed: 8, score: 25 },
                ],
                isChasing: false
            },
            {
                number: 2,  
                enemies: [
                    { type: "spider", count: 5, row: -50, speed: 3, score: 50 },
                ],
                isChasing: true,
                includesGhoul: true
            }
        ];

        // create path for enemy
        this.ghoulChangingPath = false;
        this.ghoulPath = this.add.path(0,0);

        this.ghoul = this.add.follower(this.ghoulPath, 0, 0, "ghoul").setScale(4.0);
        this.ghoul.visible = false;  // hide unless wave requires it

        this.init_game();

    }

    update() {
        let my = this.my;

        // Moving left
        if (this.left.isDown) {
            if (this.my.sprite.player.x > (this.my.sprite.player.displayWidth/2)) {
                this.my.sprite.player.x -= this.playerSpeed;
            }
        }

        // Moving right
        if (this.right.isDown) {
            if (this.my.sprite.player.x < (game.config.width - (this.my.sprite.player.displayWidth/2))) {
                this.my.sprite.player.x += this.playerSpeed;
            }
        }

        // Update hitbox position
        this.playerHitbox.x = this.my.sprite.player.x;
        this.playerHitbox.y = this.my.sprite.player.y;

        // Make all of the bullets move
        for (let bullet of my.sprite.bullet) {
            bullet.y -= this.bulletSpeed;
        }

        if (Phaser.Input.Keyboard.JustDown(this.space)) {
            if (my.sprite.bullet.length < this.maxBullets) {
                my.sprite.bullet.push(this.add.sprite(this.my.sprite.player.x, this.my.sprite.player.y - (this.my.sprite.player.displayHeight / 2), "sword").setScale(2));
            }
        }

        // Remove bullets that are off the screen
        my.sprite.bullet = my.sprite.bullet.filter((bullet) => bullet.y > -(bullet.displayHeight));

        //bullet collision with enemies
        for (let bullet of my.sprite.bullet) {
            for (let enemy of my.sprite.enemies) {
                if (this.collides(enemy, bullet)) {
                    bullet.y = -100;

                    enemy.destroy();
                    enemy.visible = false;
                    this.my.sprite.enemies = this.my.sprite.enemies.filter(e => e !== enemy);
                    this.playerScore += enemy.scorePoints;
                    this.updateScore();

                }
            }

            if (this.ghoul && this.ghoul.visible) {
                for (let bullet of my.sprite.bullet) {
                    if (this.collides(this.ghoul, bullet)) {
                        bullet.y = -100;
                        this.ghoul.stopFollow();
                        this.ghoul.visible = false;
                        this.playerScore += 50;
                        this.updateScore();
                    }
                }
            }
        } 
        
        // Enemy movement
        for (let enemy of my.sprite.enemies) {
            //spider movement
            if (enemy.isChasing) {
                let dx = this.my.sprite.player.x - enemy.x;
                let dy = this.my.sprite.player.y - enemy.y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist !== 0) {
                    enemy.x += (dx / dist) * enemy.speed;
                    enemy.y += (dy / dist) * enemy.speed;
                }

                if (this.collides(enemy, this.playerHitbox)) {
                    enemy.destroy();
                    this.my.sprite.enemies = this.my.sprite.enemies.filter(e => e !== enemy);
                    this.handlePlayerHit();
                }
            } else {    
                enemy.x += enemy.speed * enemy.direction;
                let halfWidth = enemy.displayWidth / 2;
                if (enemy.x >= (game.config.width - halfWidth) || enemy.x <= halfWidth) {
                    enemy.direction *= -1;
                }
            }
        }
        
        //enemy bullets
        for (let i = this.my.sprite.enemybullet.length - 1; i >= 0; i--) {
            let axe = this.my.sprite.enemybullet[i];
            axe.y += axe.speed;

            // Remove axe if it goes off the bottom of the screen
            if (axe.y > game.config.height + axe.displayHeight / 2) {
                axe.destroy();
                this.my.sprite.enemybullet.splice(i, 1);
                continue;
            }
        
            // Collision with player
            if (this.collides(axe, this.playerHitbox)) {
                axe.destroy();
                this.my.sprite.enemybullet.splice(i, 1);
                this.handlePlayerHit();
            }
        }

        // ghoul pathing
        if (this.ghoul && this.ghoul.visible && this.ghoul.isFollowing) {
            if (!this.ghoulChangingPath && this.ghoul.pathTween && this.ghoul.pathTween.progress > 0.95) {
                this.ghoulChangingPath = true;
                this.randomGhoulPath();
            }
        }

        // wave shortcuts
        for (let i = 1; i <= 3; i++) {
            const keyName = ["one", "two", "three"][i - 1];
            if (Phaser.Input.Keyboard.JustDown(this.waveChange[keyName])) {
                if (i <= this.waves.length) {
                    console.log(`Jumping to Wave ${i}`);
                    this.startWave(i);
                }
            }
        }

        // if waves are gone, next wave
        if (
            this.my.sprite.enemies.length === 0 &&
            !this.waveStarting &&
            this.waveLevel < this.waves.length
        ) {
            this.waveStarting = true;
            this.time.delayedCall(1000, () => this.startWave(this.waveLevel + 1));
        }

        
    }

    init_game() {
        this.playerHealth = 3;
        this.playerScore = 0;
        this.waveLevel = 1;
        this.waveStarting = false;

        this.ui.health.textContent = "❤️❤️❤️";
        this.ui.score.textContent = "Score: 0";
        this.ui.wave.textContent = "Wave: 1";

        ["bullet", "enemies", "axe"].forEach(key => {
            if (this.my.sprite[key]) this.my.sprite[key].forEach(o => o.destroy());
            this.my.sprite[key] = [];
        });

        this.startWave(1);
    }

    startWave(waveNumber) {
        const wave = this.waves.find(w => w.number === waveNumber);
        if (!wave) return;

        this.ui.wave.textContent = `Wave: ${wave.number}`;
        this.waveLevel = wave.number;
        this.waveStarting = false;

        // clear all current enemies, bullets, and enemy bullets for wave switching 
        ["bullet", "enemies", "enemybullet"].forEach(key => {
            if (this.my.sprite[key]) this.my.sprite[key].forEach(o => o.destroy());
            this.my.sprite[key] = [];
        });

        for (let enemy of wave.enemies) {
            for (let i = 0; i < enemy.count; i++) {
                let x = Phaser.Math.Between(50, game.config.width - 50);
                let sprite = this.add.sprite(x, enemy.row, enemy.type).setScale(4).setOrigin(0.5);
                sprite.type = enemy.type;
                sprite.scorePoints = enemy.score;
                sprite.direction = Phaser.Math.Between(0, 1) ? 1 : -1;

                // give spiders random speed
                if (enemy.type === "spider") {
                    sprite.speed = Phaser.Math.FloatBetween(2, 8);
                } else {
                    sprite.speed = enemy.speed;
                }
                

                sprite.isChasing = wave.isChasing;
                this.my.sprite.enemies.push(sprite);
            }
            // If the wave includes ghoul, activate its path
            if (wave.includesGhoul) {
                if (!this.ghoul) {
                    this.ghoul = this.add.follower(this.ghoulPath, 0, 0, "ghoul").setScale(4);
                }
                this.randomGhoulPath(); 
                this.ghoul.visible = true;
            } else {
                if (this.ghoul) {
                    this.ghoul.stopFollow();
                    this.ghoul.visible = false;
                }
            }
        }
    }

    collides(a, b) {
        if (Math.abs(a.x - b.x) > (a.displayWidth/2 + b.displayWidth/2)) return false;
        if (Math.abs(a.y - b.y) > (a.displayHeight/2 + b.displayHeight/2)) return false;
        return true;
    }

    spawnRow(enemyType, rowPos, count, spriteKey, speed, score) {
        for (let i = 0; i < count; i++) {
            let x = Phaser.Math.Between(50, game.config.width - 50);
            let animal = this.add.sprite(x, rowPos, spriteKey)
                              .setScale(0.4)
                              .setOrigin(0.5);
            enemy.type = enemyType;
            enemy.scorePoints = score;
            enemy.speed = speed;
            enemy.direction = Phaser.Math.Between(0, 1) ? 1 : -1;
            this.my.sprite.enemies.push(enemy);
        }
    }

    throwAxe() {
        for (let bullet of this.my.sprite.bullet) {
            if (bullet.type === "cyclops" && bullet.visible) {
                let axe = this.add.sprite(bullet.x, bullet.y + bullet.displayHeight / 2, "axe")
                                 .setScale(2.0);
                axe.speed = 8;
                this.my.sprite.axe.push(axe);
            }
        }
    }

    randomGhoulPath() {
        if (this.ghoulPath) this.ghoulPath.destroy();

        const startX = this.ghoul.x;
        const startY = this.ghoul.y;
        const numPoints = Phaser.Math.Between(4, 8);

        this.ghoulPath = this.add.path(startX, startY);
        for (let i = 0; i < numPoints; i++) {
            const x = Phaser.Math.Between(0, 960);
            const y = Phaser.Math.Between(0, 380);
            this.ghoulPath.lineTo(x, y);
        }

        this.ghoul.setPath(this.ghoulPath);
        this.ghoul.startFollow({
            duration: Phaser.Math.Between(6000, 8000),
            rotateToPath: true,
            rotationOffset: -90
        });

        this.ghoulChangingPath = false;
    }

    handlePlayerHit() {
        if (this.playerHealth > 0) {
            this.playerHealth -= 1;
            this.updateHealthDisplay();
    
        }
    
        if (this.playerHealth <= 0) {
            this.gameOver(); 
        }
    }

    updateHealthDisplay() {
        let hearts = "";
        for (let i = 0; i < this.playerHealth; i++) {
            hearts += "❤️";
        }
        this.ui.health.textContent = hearts;
    }

    updateScore() {
        let my = this.my;
        this.ui.score.textContent = "Score : " + this.playerScore;
    }

    gameOver() {
        this.add.text(300, 240, "GAME OVER", {
            fontFamily: "Titan One",
            fontSize: "48px",
            color: "#ff0000"
        }).setOrigin(0.5);
    
        this.add.text(300, 300, "Press R to Restart", {
            fontFamily: "Titan One",
            fontSize: "24px",
            color: "#ffffff"
        }).setOrigin(0.5);
    
        this.input.keyboard.once('keydown-R', () => {
            this.scene.start("titleScene");  // back to title
        });
    }
}