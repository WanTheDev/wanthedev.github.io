import {Container, Image} from '@mantine/core'
import {stars} from '../data.ts'
import classes from '../styles/starStyles.module.css'
import { useState } from 'react'

interface starPosType {
    x: number
    y: number
}

class StarClass {
    x: number
    y: number
    seed: number

    constructor() {
        this.x=Math.round(10+Math.random()*70)
        this.y=Math.round(10+Math.random()*70)
        this.seed=Math.round(Math.random()*255)
    }
}

function Star({pos, foreground=undefined}:{pos: starPosType, foreground?: boolean}) {
    if (pos==undefined) {
        return(null)
    }
    //const {classes, cx} = useStarStyles({ animationSeed })

    return(
        <Container className={classes.wobble} data-foreground={foreground} left={`${pos.x}%`} top={`${pos.y}%`} pos="absolute" miw="1.5rem" h="10%">
        
        <Image pos="absolute" src={stars.shadow} className={classes.star} data-shadow/>
        <Image pos="absolute" src={stars.normal} className={classes.star} data-glow/>
        <Image pos="absolute" src={stars.normal} className={classes.star}/>
        
        </Container>
    )
}
export default function StarryArea({starAmount=3, backgroundStarAmount=2}:{starAmount?:number, backgroundStarAmount?:number}) {
    const [stars, _setStars] = useState({
      foreground: new Array(starAmount).fill(0).map(() => new StarClass()),
      background: new Array(backgroundStarAmount).fill(0).map(() => new StarClass())
    })
    
    return(
      <Container w="100%" h="100%" pos="absolute" top="0" left="0" >
        {stars.background.map((curStar, starIndex) => {
          return(
            <Star key={starIndex} pos={curStar} />
          )
        })}
        {stars.foreground.map((curStar, starIndex) => {
          return(
            <Star key={starIndex} pos={curStar} foreground={true}/>
          )
        })}
      </Container>
    )
  }