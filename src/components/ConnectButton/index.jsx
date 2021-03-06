// @flow
import React from 'react'
import Web3Connect from 'web3connect'
import Torus from '@toruslabs/torus-embed'
import WalletConnectProvider from '@walletconnect/web3-provider'
import Fortmatic from 'fortmatic'
import Portis from '@portis/web3'
import Squarelink from 'squarelink'
import Button from '~/components/layout/Button'
import { fetchProvider, removeProvider } from '~/logic/wallets/store/actions'
import { getNetwork } from '~/config'
import { store } from '~/store'

const isMainnet = process.env.REACT_APP_NETWORK === 'mainnet'

const PORTIS_DAPP_ID = isMainnet ? process.env.REACT_APP_PORTIS_ID : '852b763d-f28b-4463-80cb-846d7ec5806b'
const SQUARELINK_CLIENT_ID = isMainnet ? process.env.REACT_APP_SQUARELINK_ID : '46ce08fe50913cfa1b78'
const FORTMATIC_API_KEY = isMainnet ? process.env.REACT_APP_FORTMATIC_KEY : 'pk_test_CAD437AA29BE0A40'

export const web3Connect = new Web3Connect.Core({
  network: getNetwork().toLowerCase(),
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        infuraId: process.env.REACT_APP_INFURA_TOKEN,
      },
    },
    portis: {
      package: Portis,
      options: {
        id: PORTIS_DAPP_ID,
      },
    },
    squarelink: {
      package: Squarelink,
      options: {
        id: SQUARELINK_CLIENT_ID,
      },
    },
    fortmatic: {
      package: Fortmatic,
      options: {
        key: FORTMATIC_API_KEY,
      },
    },
    torus: {
      package: Torus,
      options: {
        enableLogging: false,
        buttonPosition: 'bottom-left',
        buildEnv: process.env.NODE_ENV,
        showTorusButton: true,
      },
    },
  },
})

web3Connect.on('connect', (provider: any) => {
  if (provider) {
    store.dispatch(fetchProvider(provider))
  }
})

web3Connect.on('disconnect', () => {
  store.dispatch(removeProvider())
})

type Props = {
  enqueueSnackbar: Function,
  closeSnackbar: Function,
}

const ConnectButton = (props: Props) => (
  <Button
    color="primary"
    variant="contained"
    minWidth={140}
    onClick={() => {
      web3Connect.toggleModal()
    }}
    {...props}
  >
    Connect
  </Button>
)

export default ConnectButton
