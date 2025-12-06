import { ProxyAgent } from "undici"

const proxyUrl =
  process.env.HTTPS_PROXY?.trim() ||
  process.env.HTTP_PROXY?.trim() ||
  process.env.https_proxy?.trim() ||
  process.env.http_proxy?.trim()

let proxyAgent: ProxyAgent | undefined

if (proxyUrl && proxyUrl !== "http://") {
  try {
    new URL(proxyUrl)
    proxyAgent = new ProxyAgent(proxyUrl)
    console.log("[proxy] Using HTTP(S) proxy:", proxyUrl)
  } catch (error) {
    proxyAgent = undefined
    console.warn("[proxy] Invalid proxy URL, falling back to direct connection", error)
  }
} else {
  console.log("[proxy] No proxy env found, using direct connection")
}

export { proxyAgent }
