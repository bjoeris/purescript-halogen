module Example.Counter where

import Prelude

import Control.Monad.Aff (Aff(), runAff, later')
import Control.Monad.Eff (Eff())
import Control.Monad.Eff.Exception (throwException)

import Halogen
import Halogen.Util (appendToBody)
import qualified Halogen.HTML.Indexed as H
import qualified Halogen.HTML.Properties.Indexed as P

-- | The state of the application
newtype State = State Int

-- | The initial state
initialState :: State
initialState = State 0

-- | Querys to the state machine
data Query a = Tick a

-- | The main UI component.
ui :: forall g. (Functor g) => Component State Query g
ui = component render eval
  where

  render :: Render State Query
  render (State n) =
    H.div_ [ H.h1 [ P.id_ "header" ] [ H.text "counter" ]
           , H.p_ [ H.text (show n) ]
           ]

  eval :: Eval Query State Query g
  eval (Tick next) = do
    modify (\(State n) -> State (n + 1))
    pure next

-- | Run the app
main :: Eff (HalogenEffects ()) Unit
main = runAff throwException (const (pure unit)) $ do
  { node: node, driver: driver } <- runUI ui initialState
  appendToBody node
  setInterval 1000 $ driver (action Tick)

setInterval :: forall e a. Int -> Aff e a -> Aff e Unit
setInterval ms a = later' ms $ do
  a
  setInterval ms a
