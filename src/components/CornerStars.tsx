import {Container, Image} from '@mantine/core'
import {stars} from '../data.ts'
import classes from './componentStyles/starStyles.module.css'
import { useState } from 'react'

class StarClass {
    x: number
    y: number
    animDelay: string 
    animDir: string
    constructor(curCorner:number) {
        // 0 = top left
        // 1 = top right
        // 2 = bottom left
        // 3 = bottom right
        this.x=Math.round(Math.random() * 5 + ((curCorner%2==0) ? 20 : 80))
        this.y=Math.round(Math.random() * 5 + ((curCorner<2) ? 80 : 20))
        this.animDelay=Math.floor(Math.random()*-6500)+'ms'
        this.animDir=Math.random()>0.5 ? 'normal' : 'reverse'
    }
}

function Star({starClass, foreground=undefined}:{starClass: InstanceType<typeof StarClass>, foreground?: boolean}) {
    return(
        <Container className={classes.wobble} style={{animationDelay: starClass.animDelay,  animationDirection: starClass.animDir}} data-foreground={foreground} left={`${starClass.x}%`} top={`${starClass.y}%`} pos="absolute" w="5%" h="5%">
        
          <Image pos="absolute" src={stars.shadow} className={classes.star} data-shadow/>
          <Image pos="absolute" src={stars.normal} className={classes.star} data-glow/>
          <Image pos="absolute" src={stars.normal} className={classes.star}/>
        
        </Container>
    )
}
export default function CornerStars() {
    const [stars, _setStars] = useState([new StarClass(0), new StarClass(3)])
    
    return(
      <Container className={classes.starryArea}>
        {stars.map((curStar, starIndex) => {
          return(
            <Star key={starIndex} starClass={curStar} />
          )
        })}
      </Container>
    )
  }