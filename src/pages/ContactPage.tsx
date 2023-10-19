import { Button, TextInput, Textarea } from "@mantine/core";
import { useMediaQuery, useTimeout } from "@mantine/hooks"
import { useForm } from '@mantine/form';
import emailjs from 'emailjs-com';
import { useEffect, useState } from "react";
import Shadow from '../components/Shadow'
import CornerStars from "../components/CornerStars";
import classes from './pageStyles/contactStyles.module.css'
import cx from 'clsx'

export default function ContactPage() {
    const shortScreen = useMediaQuery('(max-height: 50em)') as (boolean & number);
    const longScreen = useMediaQuery('(min-height: 75em)') as (boolean & number);
    const [sentEmails, setSentEmails] = useState(0) 
    const maxEmailsSent=3
    const [emailState, setEmailState] = useState<number>(0)
    const { start:buttonDelayStart } = useTimeout(() => setEmailState(0), 1500); // resets email state after X miliseconds when its in 'sending' or 'error' state
    const { start:slowdownDelayStart } = useTimeout(() => {setEmailState(0); setSentEmails(curSent => curSent-1)}, 10000);
    
    const buttonStates:Array<{text: string, color: string, type:'submit' | 'button'}>=[
      {text: 'Send', color: 'primary.1', type: 'submit'}, // email state 0
      {text: 'Sending', color:'primary.3', type: 'button'}, // email state 1
      {text: 'Sent!', color:'primary.2', type: 'button'}, // email state 2
      {text: 'Error', color:'primary.4', type: 'button'}, // email state 3
      {text: 'Slow down!', color:'primary.4', type: 'button'}, // email state 4
    ]

    const form = useForm({
      initialValues: {
        contact: '',
        message: '',
      },
      validate: {
        message: (cur) => (cur.length<=15 ? 'Please include a meaningful message.' : null)
      }
    });

    useEffect(() => {
      if (emailState>1) {
        if (emailState<4) {
          buttonDelayStart() // if email state is at sent or error, reset it back to idle in X miliseconds
        }else {
          slowdownDelayStart() // if email state is at slow down
        }
      }
    }, [emailState])

    var contactSubmit = (senderContact:string, message:string) => {
      if (process.env.SERVICE_ID==undefined || process.env.TEMPLATE_ID==undefined || process.env.USER_ID==undefined) {
        setEmailState(3) // error
        return; 
      }
      if (sentEmails>=maxEmailsSent) {
        setEmailState(4) // slow down
        return;
      }

      setEmailState(1) // sending

      emailjs.send(process.env.SERVICE_ID,process.env.TEMPLATE_ID, {from_email: senderContact, message: message}, process.env.USER_ID)
      .then(
        () => { setEmailState(2); setSentEmails(curSent => curSent+1) }, // sent
        () => { setEmailState(3) } // error
      )
    }

    return(
      <>
      <div className={classes.contactWrapper}>
        <form className={classes.contactForm} onSubmit={form.onSubmit((values) => contactSubmit(values.contact, values.message))}>
          <div className={classes.contactStackWrapper}>
            <TextInput classNames={{input: classes.formSizing}} {...form.getInputProps('contact')} placeholder="Contact information"/>
            <Textarea classNames={{input: classes.formSizing}}  {...form.getInputProps('message')} placeholder="Message" minRows={longScreen * 3 + 17 - shortScreen * 5} multiline autosize/>
            
            <Button className={cx(classes.submitButton, classes.formSizing)} color={buttonStates[emailState].color} type={buttonStates[emailState].type} onClick={() => {
              if (emailState>1 && emailState<4) { buttonDelayStart() } // fallback for timeout
            }}>
              {buttonStates[emailState].text}
            </Button>

            <Shadow />
            <CornerStars starPreset={[0, 3]} />
          </div>
        </form>
      </div>
      </>
    )
  }