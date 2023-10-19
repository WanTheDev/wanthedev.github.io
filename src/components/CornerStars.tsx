import {Container} from '@mantine/core'
import classes from './componentStyles/starStyles.module.css'
import { useState } from 'react'
import {Star, StarClass} from './Star'
function getRandomCornerPositions() {
  var possibleCorners=[0,1,2,3]
  var randomIndex=Math.floor(Math.random()*4)
  var randomNext=1+Math.floor(Math.random()*3)

  return([
    possibleCorners[randomIndex],
    possibleCorners[(randomIndex+randomNext) % 4]
  ])
}
export default function CornerStars({starPreset}:{starPreset?:Array<number>}) {
    const [stars, _setStars] = useState(
      (starPreset==undefined ? getRandomCornerPositions() :
      starPreset).map((curCornerPosition:number) => new StarClass(curCornerPosition))
      )
    
    return(
      <Container className={classes.starryArea}>
        {stars.map((curStar, starIndex) => {
          return(
            <Star key={starIndex} starClass={curStar} foreground={true}/>
          )
        })}
      </Container>
    )
  }