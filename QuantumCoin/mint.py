#!/usr/bin/python3
#coding: utf-8

from hashlib import sha256

hashStr = ''
nonce = 0
args = __import__('sys').argv
test = int(args[1])
diff = 230

print("Application de la PoW avec " + str(test) + " et difficulté à 2**" + str(diff) + " ...")

while True :
    hashStr = sha256(test.to_bytes(32, "big")).hexdigest()
    if (int(hashStr, base=16) < 2**diff) :
        print("Nonce : " + str(nonce))
        print("Hash correspondant : " + hashStr)
        break
    nonce += 1
    test += 1
