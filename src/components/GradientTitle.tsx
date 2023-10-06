import {Title} from '@mantine/core'
import classes from './componentStyles/gradientTitleStyles.module.css'
export default function GradientTitle({title, gradientColors}:{title:string, gradientColors: Array<string>}) {
    return(
      <div className={classes.gradientTitleContainer}>
        <Title
          className={classes.gradientTitle}
          style={{backgroundImage: `linear-gradient(125deg, ${gradientColors[0]}, ${gradientColors[1]})`}}
        >
          {title}
          <div
            className={classes.gradientGlow}
            style={{backgroundImage: `linear-gradient(125deg, ${gradientColors[0]}, ${gradientColors[1]})`}}>
          </div>
        </Title>
      </div>
    )
  }