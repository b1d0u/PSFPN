#!/usr/bin/python3
#coding: utf-8

from hashlib import sha256
from multiprocessing import Pool
from sys import stdout, argv, exit
from time import time

waitChars = ["|", "/", "-", "\\"]
waitCount = 0

def find_solution(args) :
    """ Cherche des solution à la PoW 
        args doit être de la forme (encodedBlock, difficulty, nonce_range)
        où nonce_range est de la forme (nonce + i * batch_size, nonce + (i+1) * batch_size)
        avec i >= 0 et batch_size la taille d'un bloc de nonces à tester. """
    encodedBlock, difficulty, nonce_range = args
    myHash = bytes()
    test = 0

    for nonce in range(nonce_range[0], nonce_range[1]) :
        test = encodedBlock + nonce
        myHash = sha256(test.to_bytes(32, 'big')).digest()
        if (int.from_bytes(myHash, 'big') < difficulty) :
            return (nonce, hex(int.from_bytes(myHash, 'big')))

    return None


def proof_of_work(encodedBlock, difficulty, n_processes=4) :
    """ Fonction parallèle de recherche d'un nonce valide pour
        la PoW """
    global waitChars, waitCount

    # Taille d'un paquet
    batch_size = 1000000
    pool = Pool(n_processes)
    nonce = 0

    while True :
        # Affiche une belle anim pour patienter ...
        stdout.write("\rRecherche en cours ... " + waitChars[waitCount] + "\b")
        waitCount = (waitCount + 1) % 4

        # Paramètres à donner aux n_processes processus créés
        params = [(encodedBlock, difficulty, (nonce + i * batch_size, nonce + (i+1) * batch_size)) for i in range(n_processes)]

        # Appel aux fonctions, création des processus et attente des résultats
        solutions = pool.map(find_solution, params)

        # Recherche des résultats "non-None"
        solutions = list(filter(None, solutions))

        # Si on en a au moins une, on a fini
        if (len(solutions) > 0) :
            return solutions

        # Sinon, on continue pour un nouveau paquet de nonces
        nonce += n_processes * batch_size


def mine(encodedBlock, startingNonce, numberOfProcs, difficulty) :
    """ Fonction séquentielle de recherche d'un nonce valide pour
        la PoW """
    hashStr = ''
    nonce = startingNonce
    block = encodedBlock
    keepMining = True
    me = str(startingNonce)

    while (keepMining) :
        # Hash du bloc encodé avec le nonce
        hashStr = sha256(block.to_bytes(32, "big")).hexdigest()
        # Si le bloc est valide :
        if (int(hashStr, base=16) < difficulty) :
            # On affiche son nonce, son hash et on d'arrête
            print("Nonce : " + str(nonce))
            print("Hash correspondant : " + hashStr)
            keepMining = False

        # Sinon, nonce suivant.
        nonce += numberOfProcs
        block += numberOfProcs


def usage() :
    print("Utilisation : python[3] mint.py <bloc_encodé> [nombre_de_processus]")
    exit(1)


# Fonction main
if (__name__ == '__main__') :
    # Longueur des arguments passés aux script
    avLen = len(argv)

    # Il nous faut au moins le bloc encodé
    if (avLen <= 1) :
        usage()

    # Bloc encodé (i.e. entier étant la somme des différentes
    # valeurs du bloc, considérées comme des entiers)
    encBlk = int(argv[1])

    # Difficulté de la PoW (puissance de 2)
    diff = 230

    # Nombre de processus créés en cas de calcul parallèle
    numberOfProcs = 1

    # Pool de processus
    pool = []

    print("Application de la PoW avec " + str(encBlk) + " et la difficulté ficée à 2^" + str(diff) + " ...")

    # Si on a passé un nombre de processus en argument, on passe en parallèle
    if (avLen > 2) :
        numberOfProcs = int(argv[2], base=10)

        assert numberOfProcs > 0, "Le nombre de processus doit être > 0"

        print("Nombre de processus : " + str(numberOfProcs))

        # Départ chrono
        start = time()
        solutions = proof_of_work(encBlk, 2**diff, numberOfProcs)

        # Affichage des résultats
        print('\n' + '\n'.join('%d => %s' % s for s in solutions))
        print("Solution trouvée en %.3f secondes" % (time() - start))

    # Sinon, calcul séquentiel
    else :
        mine(encBlk, 0, 1, 2**diff)
