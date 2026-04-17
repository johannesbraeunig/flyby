import type { BuildAction } from 'remix/fetch-router'

import { routes } from '../routes.ts'
import { ScreenLayout } from '../ui/screen-layout.tsx'
import { Landing } from '../ui/screens/landing.tsx'
import { Overhead } from '../ui/screens/overhead.tsx'
import { Board } from '../ui/screens/board.tsx'
import { Radar } from '../ui/screens/radar.tsx'
import { Detail } from '../ui/screens/detail.tsx'
import { Empty } from '../ui/screens/empty.tsx'
import { render } from '../utils/render.tsx'

export let screenLanding: BuildAction<'GET', typeof routes.screenLanding> = {
  async handler({ url }) {
    let origin = new URL(url).origin
    return render(<ScreenLandingPage origin={origin} />, {
      headers: { 'Cache-Control': 'no-store' },
    })
  },
}

export let screenOverhead: BuildAction<'GET', typeof routes.screenOverhead> = {
  async handler({ url }) {
    let origin = new URL(url).origin
    return render(<ScreenOverheadPage origin={origin} />, {
      headers: { 'Cache-Control': 'no-store' },
    })
  },
}

export let screenBoard: BuildAction<'GET', typeof routes.screenBoard> = {
  async handler({ url }) {
    let origin = new URL(url).origin
    return render(<ScreenBoardPage origin={origin} />, {
      headers: { 'Cache-Control': 'no-store' },
    })
  },
}

export let screenRadar: BuildAction<'GET', typeof routes.screenRadar> = {
  async handler({ url }) {
    let origin = new URL(url).origin
    return render(<ScreenRadarPage origin={origin} />, {
      headers: { 'Cache-Control': 'no-store' },
    })
  },
}

export let screenDetail: BuildAction<'GET', typeof routes.screenDetail> = {
  async handler({ url }) {
    let origin = new URL(url).origin
    return render(<ScreenDetailPage origin={origin} />, {
      headers: { 'Cache-Control': 'no-store' },
    })
  },
}

export let screenEmpty: BuildAction<'GET', typeof routes.screenEmpty> = {
  async handler({ url }) {
    let origin = new URL(url).origin
    return render(<ScreenEmptyPage origin={origin} />, {
      headers: { 'Cache-Control': 'no-store' },
    })
  },
}

function ScreenLandingPage() {
  return ({ origin }: { origin: string }) => (
    <ScreenLayout title="FlyBy — Landing" origin={origin}>
      <Landing origin={origin} />
    </ScreenLayout>
  )
}

function ScreenOverheadPage() {
  return ({ origin }: { origin: string }) => (
    <ScreenLayout title="FlyBy — Overhead" origin={origin}>
      <Overhead origin={origin} />
    </ScreenLayout>
  )
}

function ScreenBoardPage() {
  return ({ origin }: { origin: string }) => (
    <ScreenLayout title="FlyBy — Board" origin={origin}>
      <Board origin={origin} />
    </ScreenLayout>
  )
}

function ScreenRadarPage() {
  return ({ origin }: { origin: string }) => (
    <ScreenLayout title="FlyBy — Radar" origin={origin}>
      <Radar origin={origin} />
    </ScreenLayout>
  )
}

function ScreenDetailPage() {
  return ({ origin }: { origin: string }) => (
    <ScreenLayout title="FlyBy — Flight Detail" origin={origin}>
      <Detail origin={origin} />
    </ScreenLayout>
  )
}

function ScreenEmptyPage() {
  return ({ origin }: { origin: string }) => (
    <ScreenLayout title="FlyBy — Empty Sky" origin={origin}>
      <Empty origin={origin} />
    </ScreenLayout>
  )
}
