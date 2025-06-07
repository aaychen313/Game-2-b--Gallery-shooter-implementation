class TitleScene extends Phaser.Scene {
    constructor() {
        super("titleScene");
    }



    create() {
        

        this.add.text(300, 200, " Galler Shooter Project", {
            fontFamily: "Titan One",
            fontSize: "48px",
            color: "#ffffff",
            stroke: "#2E6F40",
            strokeThickness: 8,
            
        }).setOrigin(0.5);

        let startText = this.add.text(300, 280, "Press SPACE to Start!", {
            fontFamily: "Titan One",
            fontSize: "24px",
            color: "#eeeeee",
            stroke: "#2E6F40",
            strokeThickness: 6,
        }).setOrigin(0.5);

        this.tweens.add({
            targets: startText,
            alpha: { from: 1, to: 0.4 },
            duration: 800,
            yoyo: true,
            repeat: -1
          });

        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start("gameScene");
        });
    }
}