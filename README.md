#  Projet TFE - Chalet Gérardmer

Bienvenue sur le dépôt de mon Travail de Fin d'Études (EAFC Namur-Cadets).
Il s'agit d'une plateforme de réservation pour un chalet modulable situé dans les Vosges, développée avec **Symfony** (Back-end) et **Vue.js** (Front-end).

## 1. Initialisation du projet

Une fois le projet cloné ou téléchargé sur votre machine locale, ouvrez un terminal à la racine du projet et exécutez la commande suivante pour installer les dépendances :

```bash
composer install
```

Crée un fichier env.local avec ces clés apiKey et apiSecret :

```bash
DATABASE_URL="mysql://root:@127.0.0.1:3306/chalet_location?serverVersion=8.0.32&charset=utf8mb4"

STRIPE_PUBLIC_KEY=pk_test_51TNZeGKDluN1fbgqQzETyBZ74Qf8RyAo3wFWIfRILaWBzDG8GbhIhRQ6lCLEuWwFB1fZwHiSFuNx917Q9FFw8UcC00HTF6xejM
STRIPE_SECRET_KEY=sk_test_51TNZeGKDluN1fbgqMMN65VBXFjP0qrf4woCxWMAJG3sc2MUlly19F6sywzw0ORcOaVcLmY3FFNioL59lcrgVDMBl00kvRMonmC
STRIPE_WEBHOOK_SECRET=whsec_53f8a7d820962fd8c0938e7d6a495dfc830a7eb0e31d133f03ceea28e97d65c2
MAILER_DSN=brevo+api://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@default
```

Créez la base de données et appliquez les migrations avec ces commandes :

```bash
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
```
## 2. Lancement du serveur
Pour démarrer l'application, lancez le serveur local de Symfony :
```bash
symfony serve
```
Pour démarrer stripe :
```bash
stripe listen --forward-to http://127.0.0.1:8000/api/webhook/stripe
```
## 3. Compte administrateur
Espace Administrateur (Propriétaire) :

Email : admin@chalet.be

Mot de passe : admin123
