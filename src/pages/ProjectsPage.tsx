import { Button, Card, SimpleGrid, Text, Title, Image } from "@mantine/core"
import { projectData } from '../data.ts'

export default function ProjectsPage() {
    // as boolean & number due to doing boolean math later on for a responsive layout 
    /*
    useEffect(() => {
      fetch("/apiGet/projectsData")
      .then(response => response.json())
      .then(data => {
        setAllProjects(
          data.map((curProject:projectType, index:number) => {
            return{...curProject, image:`./apiGet/images/banners?name=${curProject.image}`}
          })
        )
      })
    }, [])
    */
   // mt={rem(headroomHeight)}
    return(
      <SimpleGrid cols={{base: 4, md: 2, sm: 1}} spacing={{base: 'md', md: 'sm'}} p="xl" >
        {
          projectData.map((curProject) => {
            return(
              <Card h="fit-content" key={curProject.name}>
                <Card.Section component="a" href={curProject.imageLink.link} target="_blank">
                  <Image src={curProject.imageLink.image}/>
                </Card.Section>
                <Title>{curProject.name}</Title>
                <Text c="dimmed">{curProject.desc}</Text>
                <Button bg="primary.1" fw="normal" fullWidth mt="xl" onClick={() => window.open(curProject.imageLink.link)}>Open</Button>
              </Card>
            )
          })
        }
      </SimpleGrid>
    )
  }