import {Container, Image} from '@mantine/core'
import {stars} from '../data.ts'
import classes from './componentStyles/starStyles.module.css'
import { useState } from 'react'

class StarClass {
    x: number
    y: number
    animDelay: string 
    animDir: string

    constructor() {
        this.x=Math.round(Math.random()*80)
        this.y=Math.round(Math.random()*80)
        this.animDelay=Math.floor(Math.random()*-6500)+'ms'
        this.animDir=Math.random()>0.5 ? 'normal' : 'reverse'
    }
}

function Star({starClass, foreground=undefined}:{starClass: InstanceType<typeof StarClass>, foreground?: boolean}) {
    return(
        <Container className={classes.wobble} style={{animationDelay: starClass.animDelay,  animationDirection: starClass.animDir}} data-foreground={foreground} left={`${starClass.x}%`} top={`${starClass.y}%`} pos="absolute" miw="1.5rem" h="10%">
        
          <Image pos="absolute" src={stars.shadow} className={classes.star} data-shadow/>
          <Image pos="absolute" src={stars.normal} className={classes.star} data-glow/>
          <Image pos="absolute" src={stars.normal} className={classes.star}/>
        
        </Container>
    )
}
export default function StarryArea({starAmount=3, backgroundStarAmount=3}:{starAmount?:number, backgroundStarAmount?:number}) {
    const [stars, _setStars] = useState({
      foreground: new Array(starAmount).fill(0).map(() => new StarClass()),
      background: new Array(backgroundStarAmount).fill(0).map(() => new StarClass())
    })
    
    return(
      <Container className={classes.starryArea}>
        {stars.background.map((curStar, starIndex) => {
          return(
            <Star key={starIndex} starClass={curStar} />
          )
        })}
        {stars.foreground.map((curStar, starIndex) => {
          return(
            <Star key={starIndex} starClass={curStar} foreground={true}/>
          )
        })}
      </Container>
    )
  }