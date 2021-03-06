// @flow
import type { Action, Store } from 'redux'
import { List } from 'immutable'
import { push } from 'connected-react-router'
import { type GlobalState } from '~/store/'
import { ADD_TRANSACTIONS } from '~/routes/safe/store/actions/addTransactions'
import { ADD_INCOMING_TRANSACTIONS } from '~/routes/safe/store/actions/addIncomingTransactions'
import { getAwaitingTransactions } from '~/logic/safe/transactions/awaitingTransactions'
import { userAccountSelector } from '~/logic/wallets/store/selectors'
import enqueueSnackbar from '~/logic/notifications/store/actions/enqueueSnackbar'
import { enhanceSnackbarForAction, NOTIFICATIONS } from '~/logic/notifications'
import closeSnackbarAction from '~/logic/notifications/store/actions/closeSnackbar'
import { getIncomingTxAmount } from '~/routes/safe/components/Transactions/TxsTable/columns'
import updateSafe from '~/routes/safe/store/actions/updateSafe'
import { loadFromStorage } from '~/utils/storage'
import { SAFES_KEY } from '~/logic/safe/utils'
import { RECURRING_USER_KEY } from '~/utils/verifyRecurringUser'
import { safesMapSelector } from '~/routes/safe/store/selectors'
import { isUserOwner } from '~/logic/wallets/ethAddresses'

const watchedActions = [ADD_TRANSACTIONS, ADD_INCOMING_TRANSACTIONS]

const notificationsMiddleware = (store: Store<GlobalState>) => (
  next: Function,
) => async (action: Action<*>) => {
  const handledAction = next(action)
  const { dispatch } = store

  if (watchedActions.includes(action.type)) {
    const state: GlobalState = store.getState()
    switch (action.type) {
      case ADD_TRANSACTIONS: {
        const transactionsList = action.payload
        const userAddress: string = userAccountSelector(state)
        const safeAddress = action.payload.keySeq().get(0)
        const awaitingTransactions = getAwaitingTransactions(
          transactionsList,
          userAddress,
        )
        const awaitingTransactionsList = awaitingTransactions.get(
          safeAddress,
          List([]),
        )
        const safes = safesMapSelector(state)
        const currentSafe = safes.get(safeAddress)

        if (
          !isUserOwner(currentSafe, userAddress)
          || awaitingTransactionsList.size === 0
        ) {
          break
        }

        const notificationKey = `${safeAddress}-${userAddress}`
        const onNotificationClicked = () => {
          dispatch(closeSnackbarAction({ key: notificationKey }))
          dispatch(push(`/safes/${safeAddress}/transactions`))
        }
        dispatch(
          enqueueSnackbar(
            enhanceSnackbarForAction(
              NOTIFICATIONS.TX_WAITING_MSG,
              notificationKey,
              onNotificationClicked,
            ),
          ),
        )

        break
      }
      case ADD_INCOMING_TRANSACTIONS: {
        action.payload.forEach(async (incomingTransactions, safeAddress) => {
          const storedSafes = await loadFromStorage(SAFES_KEY)
          const latestIncomingTxBlock = storedSafes
            ? storedSafes[safeAddress].latestIncomingTxBlock
            : 0

          const newIncomingTransactions = incomingTransactions.filter(
            (tx) => tx.blockNumber > latestIncomingTxBlock,
          )
          const { message, ...TX_INCOMING_MSG } = NOTIFICATIONS.TX_INCOMING_MSG
          const recurringUser = await loadFromStorage(RECURRING_USER_KEY)

          if (recurringUser) {
            if (newIncomingTransactions.size > 3) {
              dispatch(
                enqueueSnackbar(
                  enhanceSnackbarForAction({
                    ...TX_INCOMING_MSG,
                    message: 'Multiple incoming transfers',
                  }),
                ),
              )
            } else {
              newIncomingTransactions.forEach((tx) => {
                dispatch(
                  enqueueSnackbar(
                    enhanceSnackbarForAction({
                      ...TX_INCOMING_MSG,
                      message: `${message}${getIncomingTxAmount(tx)}`,
                    }),
                  ),
                )
              })
            }
          }

          dispatch(
            updateSafe({
              address: safeAddress,
              latestIncomingTxBlock: newIncomingTransactions.size
                ? newIncomingTransactions.last().blockNumber
                : latestIncomingTxBlock,
            }),
          )
        })
        break
      }
      default:
        break
    }
  }

  return handledAction
}

export default notificationsMiddleware
