import { Loader } from '@mantine/core'

export default function LoadingPage() {
    return(
        <div style={{width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <Loader color="primary.2" size="xl" />
        </div>
    )
}