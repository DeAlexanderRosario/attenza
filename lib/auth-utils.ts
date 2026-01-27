import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto"

const ITERATIONS = 100000
const KEY_LEN = 64
const ALGO = "sha512"

/**
 * Hash a password using PBKDF2
 */
export function hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex")
    const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, ALGO).toString("hex")
    return `${salt}:${hash}`
}

/**
 * Verify a password against a stored hash
 */
export function verifyPassword(password: string, storedValue: string): boolean {
    const [salt, originalHash] = storedValue.split(":")
    if (!salt || !originalHash) return false

    const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, ALGO).toString("hex")

    const originalHashBuffer = Buffer.from(originalHash, "hex")
    const currentHashBuffer = Buffer.from(hash, "hex")

    return timingSafeEqual(originalHashBuffer, currentHashBuffer)
}
