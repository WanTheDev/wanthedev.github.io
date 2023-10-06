import { Title, Image, Container, Text } from "@mantine/core"
import { projectData } from '../data.ts'
import Shadow from "../components/Shadow.tsx"
import classes from './pageStyles/projectStyles.module.css'
import CornerStars from "../components/CornerStars.tsx"
import { useMediaQuery } from '@mantine/hooks'
export default function ProjectsPage() {
  const narrowScreen = useMediaQuery('(max-width: 60em)');
  const imageSkewAmount=7.5
   return(
      <div className={classes.allProjectsContainer} >
        {
          projectData.map((curProject, projectIndex) => 
            <Container className={classes.outerContainer}
            style={narrowScreen ? {} : {
              marginTop: `${projectIndex*imageSkewAmount - (imageSkewAmount*2*(Math.floor(projectIndex/2)))}%`,
            }}
            >
              <Shadow />
              <CornerStars />
              <Container className={classes.projectContainer} onClick={() => {window.open(curProject.imageLink.link, '_blank')}}>
                <Image mih="100%" className={classes.projectImage} src={curProject.imageLink.image} />
                <Title>{curProject.name}</Title>
                <Text>{curProject.desc}</Text>
              </Container>
            </Container>
          )
        }
      </div>
      
   )
  }