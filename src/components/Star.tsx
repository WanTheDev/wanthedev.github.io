import {stars} from '../data'
import classes from './componentStyles/starStyles.module.css'


export class StarClass {
    x: number
    y: number
    animDelay: string 
    animDir: string
    constructor(curCorner?:number) {
        // 0 = top left
        // 1 = top right
        // 2 = bottom left
        // 3 = bottom right
        if (curCorner==undefined) {
            this.x=Math.round(Math.random()*80)
            this.y=Math.round(Math.random()*80)
        }else {
            this.x=Math.round(Math.random() * 5 + ((curCorner%2==0) ? 20 : 80))
            this.y=Math.round(Math.random() * 5 + ((curCorner<2) ? 80 : 20))
        }
        this.animDelay=Math.floor(Math.random()*-6500)+'ms'
        this.animDir=Math.random()>0.5 ? 'normal' : 'reverse'
    }
}

export function Star({starClass, foreground=undefined}:{starClass: InstanceType<typeof StarClass>, foreground?: boolean}) {
    return(
        <div className={classes.wobble} style={{
            animationDelay: starClass.animDelay,
            animationDirection: starClass.animDir,
            left: starClass.x+"%",
            top: starClass.y+"%"
            }} data-foreground={foreground} aria-hidden>
          <img src={stars.shadow} className={classes.star} data-shadow/>
          <img src={stars.normal} className={classes.star} data-glow/>
          <img src={stars.normal} className={classes.star}/>
        </div>
    )
}