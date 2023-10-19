import {Star, StarClass} from './Star'
import classes from './componentStyles/starStyles.module.css'
import { useState } from 'react'

export default function StarryArea({starAmount=3, backgroundStarAmount=3}:{starAmount?:number, backgroundStarAmount?:number}) {
    const [stars, _setStars] = useState({
      foreground: new Array(starAmount).fill(0).map(() => new StarClass()),
      background: new Array(backgroundStarAmount).fill(0).map(() => new StarClass())
    })
    
    return(
      <div className={classes.starryArea}>
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
      </div>
    )
  }