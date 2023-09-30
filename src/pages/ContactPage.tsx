import { Button, Flex, Input, Stack, Textarea, rem } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks"

export default function ContactPage() {
    const shortScreen = useMediaQuery('(max-height: 50em)') as (boolean & number);
    const longScreen = useMediaQuery('(min-height: 75em)') as (boolean & number);
    const sizing = longScreen ? "xl" : (shortScreen ? "sm" : "md")
    return(
      <Flex p="xl" w="100%" h="100%" justify="center">
        <Stack w="100%" maw={rem(1200)}>
          <Input placeholder="Your email" size={sizing}/>
          <Input placeholder="Subject" size={sizing}/>
          <Textarea placeholder="Message" size={sizing} minRows={longScreen * 8 + 14 - shortScreen * 8} autosize/>
          <Button bg="primary.1" fw="normal" size={sizing}>Send</Button>
        </Stack>
      </Flex>
    )
  }